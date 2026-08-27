import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import {
  DEFAULT_EMAIL_NOTIF,
  EmailNotifConfig,
  DEFAULT_SMTP,
  SmtpConfig,
  getEmailNotifications,
  getSmtpConfig,
  getCronSecret,
  GLOBAL_BRANCH_ID,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    const [config, smtp, cronSecret] = await Promise.all([
      getEmailNotifications(session.branchId),
      getSmtpConfig(),
      getCronSecret(),
    ]);
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
    const session = await requireAdmin();
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
    const branchId = session.branchId ?? GLOBAL_BRANCH_ID;
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "emailNotifications" } },
      update: { value: JSON.stringify(config) },
      create: { branchId, key: "emailNotifications", value: JSON.stringify(config) },
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
        where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "smtp" } },
        update: { value: JSON.stringify(smtp) },
        create: { branchId: GLOBAL_BRANCH_ID, key: "smtp", value: JSON.stringify(smtp) },
      });
    }

    if (body && typeof body.cronSecret === "string" && body.cronSecret.trim()) {
      await prisma.setting.upsert({
        where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "cronSecret" } },
        update: { value: JSON.stringify(body.cronSecret.trim()) },
        create: {
          branchId: GLOBAL_BRANCH_ID,
          key: "cronSecret",
          value: JSON.stringify(body.cronSecret.trim()),
        },
      });
    }

    return NextResponse.json({ config, smtp: body?.smtp ? body.smtp : undefined, ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}