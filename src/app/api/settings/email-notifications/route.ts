import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import {
  DEFAULT_EMAIL_NOTIF,
  EmailNotifConfig,
  DEFAULT_SMTP,
  SmtpConfig,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const [row, smtpRow, cronRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "emailNotifications" } }),
      prisma.setting.findUnique({ where: { key: "smtp" } }),
      prisma.setting.findUnique({ where: { key: "cronSecret" } }),
    ]);
    const config: EmailNotifConfig = row
      ? { ...DEFAULT_EMAIL_NOTIF, ...JSON.parse(row.value) }
      : DEFAULT_EMAIL_NOTIF;
    const smtp: SmtpConfig = smtpRow
      ? (() => {
          const p = JSON.parse(smtpRow.value);
          return { ...DEFAULT_SMTP, ...p, port: Number(p.port) || DEFAULT_SMTP.port };
        })()
      : DEFAULT_SMTP;
    const cronSecret = cronRow ? JSON.parse(cronRow.value) : "";
    return NextResponse.json({ config, smtp, cronSecret });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

function str(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = body && body.config ? body.config : body;

    const config: EmailNotifConfig = {
      enabled: input && typeof input.enabled === "boolean" ? input.enabled : DEFAULT_EMAIL_NOTIF.enabled,
      subject:
        typeof input?.subject === "string" && input.subject.trim()
          ? input.subject.trim()
          : DEFAULT_EMAIL_NOTIF.subject,
      body:
        typeof input?.body === "string" && input.body.trim()
          ? input.body.trim()
          : DEFAULT_EMAIL_NOTIF.body,
      morningEnabled:
        input && typeof input.morningEnabled === "boolean"
          ? input.morningEnabled
          : DEFAULT_EMAIL_NOTIF.morningEnabled,
      morningSubject:
        typeof input?.morningSubject === "string" && input.morningSubject.trim()
          ? input.morningSubject.trim()
          : DEFAULT_EMAIL_NOTIF.morningSubject,
      morningBody:
        typeof input?.morningBody === "string" && input.morningBody.trim()
          ? input.morningBody.trim()
          : DEFAULT_EMAIL_NOTIF.morningBody,
    };
    await prisma.setting.upsert({
      where: { key: "emailNotifications" },
      update: { value: JSON.stringify(config) },
      create: { key: "emailNotifications", value: JSON.stringify(config) },
    });

    if (body && body.smtp) {
      const s = body.smtp;
      const smtp: SmtpConfig = {
        host: str(s.host),
        port: Number(s.port) || DEFAULT_SMTP.port,
        secure: !!s.secure,
        user: str(s.user),
        pass: str(s.pass),
        from: str(s.from),
      };
      await prisma.setting.upsert({
        where: { key: "smtp" },
        update: { value: JSON.stringify(smtp) },
        create: { key: "smtp", value: JSON.stringify(smtp) },
      });
    }

    if (body && typeof body.cronSecret === "string" && body.cronSecret.trim()) {
      await prisma.setting.upsert({
        where: { key: "cronSecret" },
        update: { value: JSON.stringify(body.cronSecret.trim()) },
        create: { key: "cronSecret", value: JSON.stringify(body.cronSecret.trim()) },
      });
    }

    return NextResponse.json({ config, smtp: body?.smtp ? body.smtp : undefined, ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
