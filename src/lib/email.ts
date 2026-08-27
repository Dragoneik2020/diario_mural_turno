import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  getEmailNotifications,
  getShiftTypeLabels,
  getSmtpConfig,
  EmailNotifConfig,
} from "@/lib/settings";

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

  const smtp = await getSmtpConfig();
  if (!smtp.host) {
    console.warn("[email] SMTP no configurado; no se envió notificación.");
    return false;
  }

  try {
    const { subject, body } = pickTemplate(cfg, template);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: !!smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });

    await transporter.sendMail({
      from: smtp.from || smtp.user || worker.email,
      to: worker.email,
      subject: fillTemplate(subject, worker, shift, typeLabel),
      text: fillTemplate(body, worker, shift, typeLabel),
    });
    return true;
  } catch (e: any) {
    console.error("[email] Error enviando notificación:", e?.message || e);
    return false;
  }
}

export async function notifyShiftById(shiftId: string, template: Template = "assignment"): Promise<void> {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { user: { select: { name: true, email: true, cargo: true, role: true } } },
    });
    if (!shift || shift.user.role === "admin" || shift.user.role === "superadmin") return;
    const labels = await getShiftTypeLabels(shift.branchId);
    await notifyShiftAssigned(
      { name: shift.user.name, email: shift.user.email, cargo: shift.user.cargo },
      shift,
      labels[shift.type] ?? shift.type,
      template,
      shift.branchId
    );
  } catch {
    /* notificación opcional */
  }
}
