import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { DEFAULT_CARGOS } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const row = await prisma.setting.findUnique({ where: { key: "cargos" } });
    const cargos = row ? JSON.parse(row.value) : DEFAULT_CARGOS;
    return NextResponse.json({ cargos });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = body && Array.isArray(body.cargos) ? body.cargos : body;
    const cargos: string[] = Array.isArray(input)
      ? input.map((c: unknown) => String(c).trim()).filter((c: string) => c.length > 0)
      : [...DEFAULT_CARGOS];
    await prisma.setting.upsert({
      where: { key: "cargos" },
      update: { value: JSON.stringify(cargos) },
      create: { key: "cargos", value: JSON.stringify(cargos) },
    });
    return NextResponse.json({ cargos });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
