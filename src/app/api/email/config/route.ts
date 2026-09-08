import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanyManager, isDios, diosCompanyScope } from "@/lib/session";
import type { Session } from "@/lib/auth";

export const dynamic = "force-dynamic";

function resolveCompanyId(session: Session): string | null {
  if (isDios(session)) return diosCompanyScope();
  return session.companyId ?? null;
}

export async function GET() {
  try {
    const session = await requireCompanyManager();
    const companyId = resolveCompanyId(session);
    if (!companyId)
      return NextResponse.json({ connected: false, error: "No tienes empresa asociada" });

    const cfg = await prisma.companyEmailConfig.findUnique({ where: { companyId } });
    if (!cfg) return NextResponse.json({ connected: false });

    return NextResponse.json({ connected: true, provider: cfg.provider, email: cfg.email });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireCompanyManager();
    const companyId = resolveCompanyId(session);
    if (!companyId) return NextResponse.json({ error: "No tienes empresa asociada" }, { status: 400 });

    await prisma.companyEmailConfig.deleteMany({ where: { companyId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}