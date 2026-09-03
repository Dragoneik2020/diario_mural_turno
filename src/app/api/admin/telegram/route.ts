import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";
import { getTelegramConfig, DEFAULT_TELEGRAM } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

export async function GET() {
  try {
    await requireDios();
    const config = await getTelegramConfig();
    return NextResponse.json({ config });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireDios();
    const body = await req.json();
    const b = body?.config ? body.config : body;
    const current = await getTelegramConfig();

    const config = {
      enabled: typeof b?.enabled === "boolean" ? b.enabled : current.enabled,
      botToken: str(b?.botToken, current.botToken),
      messageTemplate:
        typeof b?.messageTemplate === "string" && b.messageTemplate.trim()
          ? b.messageTemplate
          : DEFAULT_TELEGRAM.messageTemplate,
      morningTemplate:
        typeof b?.morningTemplate === "string" && b.morningTemplate.trim()
          ? b.morningTemplate
          : DEFAULT_TELEGRAM.morningTemplate,
    };

    await prisma.setting.upsert({
      where: { branchId_key: { branchId: "global", key: "telegram" } },
      update: { value: JSON.stringify(config) },
      create: { branchId: "global", key: "telegram", value: JSON.stringify(config) },
    });

    return NextResponse.json({ config, ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
