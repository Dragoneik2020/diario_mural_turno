import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtTime } from "@/lib/format";
import { notifyTelegramShift } from "@/lib/telegram";
import { sendPushToUser } from "@/lib/push";
import {
  getEmailNotifications,
  getShiftTypeLabels,
  getSmtpConfig,
  EmailNotifConfig,
} from "@/lib/settings";
import {
  companyIdFromBranch,
  ensureFreshAccessToken,
  getBranchEmailConfig,
  getCompanyEmailConfig,
  StoredTokenRow,
} from "@/lib/emailOAuth";

interface WorkerLite {
  name: string;
  email: string;
  cargo?: string | null;
}

interface ShiftLite {
  type: string;
  date: Date | string;
  start: Date | string;
  end: Date | string;
  status?: string;
  notes?: string | null;
  name?: string | null;
}

type Template = "assignment" | "morning";

function pickTemplate(cfg: EmailNotifConfig, template: Template) {
  if (template === "morning") {
    return {
      subject: cfg.morningSubject?.trim() || cfg.subject,
      body: cfg.morningBody?.trim() || cfg.body,
    };
  }
  return { subject: cfg.subject, body: cfg.body };
}

function fillTemplate(tpl: string, worker: WorkerLite, shift: ShiftLite, typeLabel: string): string {
  const map: Record<string, string> = {
    "{nombre}": worker.name,
    "{tipo}": typeLabel,
    "{fecha}": fmtDate(new Date(shift.date)),
    "{inicio}": fmtTime(new Date(shift.start)),
    "{fin}": fmtTime(new Date(shift.end)),
    "{cargo}": worker.cargo || "",
    "{estado}": shift.status || "",
    "{notas}": shift.notes || "",
    "{turno}": shift.name || "",
  };
  return tpl.replace(/\{[a-z]+\}/gi, (m) => (m in map ? map[m] : m));
}

/**
 * Remitente saliente con prioridad:
 * 1) correo OAuth de la sucursal (si lo conectó) → 2) correo OAuth de la
 * empresa (si lo conectó) → 3) SMTP global.
 */
interface Mailer {
  from: string;
  send(to: string, subject: string, text: string): Promise<unknown>;
}

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Envía por la API REST de Gmail (scope gmail.send; no requiere mail.google.com). */
async function sendViaGmailApi(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  text: string
): Promise<unknown> {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset=UTF-8',
    "",
    text,
  ].join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64Url(Buffer.from(raw, "utf8")) }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gmail API send falló (${res.status}): ${err}`);
  }
  return res.json().catch(() => ({}));
}

async function buildMailer(
  branchId?: string | null,
  companyIdOverride?: string | null
): Promise<Mailer | null> {
  if (branchId) {
    const branchCfg = await getBranchEmailConfig(branchId);
    if (branchCfg) {
      const mailer = await tryOAuthMailer(branchCfg, (atEnc, exp) =>
        prisma.branchEmailConfig.update({
          where: { branchId: branchCfg.branchId },
          data: { accessTokenEnc: atEnc, expiresAt: exp },
        })
      );
      if (mailer) return mailer;
    }
  }

  const companyId =
    companyIdOverride ?? (branchId ? await companyIdFromBranch(branchId) : null);
  if (companyId) {
    const companyCfg = await getCompanyEmailConfig(companyId);
    if (companyCfg) {
      const mailer = await tryOAuthMailer(companyCfg, (atEnc, exp) =>
        prisma.companyEmailConfig.update({
          where: { companyId },
          data: { accessTokenEnc: atEnc, expiresAt: exp },
        })
      );
      if (mailer) return mailer;
    }
  }

  const smtp = await getSmtpConfig();
  if (!smtp.host) {
    console.warn("[email] SMTP no configurado; no se envió notificación.");
    return null;
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: !!smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  const from = smtp.from || smtp.user || "";
  return {
    from,
    send: (to, subject, text) =>
      transporter.sendMail({ from: from || to, to, subject, text }),
  };
}

/** Monta un remitente OAuth (Gmail vía API, Outlook vía SMTP) desde los tokens guardados. */
async function tryOAuthMailer(
  cfg: StoredTokenRow,
  persist: (accessTokenEnc: string, expiresAt: Date) => Promise<unknown>
): Promise<Mailer | null> {
  try {
    const { accessToken, email } = await ensureFreshAccessToken(cfg, persist);
    if (cfg.provider === "google") {
      return {
        from: email,
        send: (to, subject, text) => sendViaGmailApi(accessToken, email, to, subject, text),
      };
    }
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: { type: "OAuth2", user: email, accessToken },
    });
    return {
      from: email,
      send: (to, subject, text) => transporter.sendMail({ from: email, to, subject, text }),
    };
  } catch (e: any) {
    console.error("[email] OAuth del tenant falló, probando siguiente remitente:", e?.message || e);
    return null;
  }
}

export async function notifyShiftAssigned(
  worker: WorkerLite,
  shift: ShiftLite,
  typeLabel: string,
  template: Template = "assignment",
  branchId?: string | null
): Promise<boolean> {
  if (!worker.email) return false;
  const cfg = await getEmailNotifications(branchId);
  if (template === "morning" && !cfg.morningEnabled) return false;
  if (template === "assignment" && !cfg.enabled) return false;

  const mailer = await buildMailer(branchId);
  if (!mailer) return false;

  try {
    const { subject, body } = pickTemplate(cfg, template);
    await mailer.send(worker.email, fillTemplate(subject, worker, shift, typeLabel), fillTemplate(body, worker, shift, typeLabel));
    return true;
  } catch (e: any) {
    console.error("[email] Error enviando notificación:", e?.message || e);
    return false;
  }
}

export async function notifyAccountCreated(
  worker: WorkerLite,
  creds: { rut: string; password: string },
  loginUrl: string,
  branchId?: string | null
): Promise<boolean> {
  if (!worker.email) return false;
  const cfg = await getEmailNotifications(branchId);
  if (!cfg.welcomeEnabled) return false;

  const mailer = await buildMailer(branchId);
  if (!mailer) return false;

  const map: Record<string, string> = {
    "{nombre}": worker.name,
    "{rut}": creds.rut,
    "{clave}": creds.password,
    "{correo}": worker.email,
    "{url}": loginUrl,
  };
  const fillWelcome = (tpl: string) =>
    tpl.replace(/\{[a-z]+\}/gi, (m) => (m in map ? map[m] : m));

  try {
    await mailer.send(worker.email, fillWelcome(cfg.welcomeSubject), fillWelcome(cfg.welcomeBody));
    return true;
  } catch (e: any) {
    console.error("[email] Error enviando correo de bienvenida:", e?.message || e);
    return false;
  }
}

export async function notifyShiftById(shiftId: string, template: Template = "assignment"): Promise<void> {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        user: { select: { name: true, email: true, cargo: true, role: true, telegramChatId: true } },
        branch: { select: { company: { select: { plan: { select: { code: true } } } } } },
      },
    });
    if (!shift || shift.user.role === "admin" || shift.user.role === "superadmin" || shift.user.role === "dios") return;
    if (!shift.branch?.company?.plan || !["pro", "empresa"].includes(shift.branch.company.plan.code)) return;
    const labels = await getShiftTypeLabels(shift.branchId);
    await notifyShiftAssigned(
      { name: shift.user.name, email: shift.user.email, cargo: shift.user.cargo },
      shift,
      labels[shift.type] ?? shift.type,
      template,
      shift.branchId
    );
    await notifyTelegramShift(
      { name: shift.user.name, telegramChatId: shift.user.telegramChatId },
      shift,
      labels[shift.type] ?? shift.type,
      shift.branchId,
      template
    );
    await sendPushToUser(shift.userId, {
      title: template === "morning" ? "Recordatorio de turno" : "Nuevo turno asignado",
      body: `${shift.user.name}: ${labels[shift.type] ?? shift.type} · ${fmtDate(new Date(shift.date))} · ${fmtTime(new Date(shift.start))}-${fmtTime(new Date(shift.end))}`,
      url: "/dashboard",
      tag: `shift-${shift.id}-${template}`,
    });
  } catch {
    /* notificación opcional */
  }
}
