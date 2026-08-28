import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DEPARTAMENTOS,
  getDepartamentos,
  GLOBAL_BRANCH_ID,
} from "@/lib/settings";
import { requireUser, requireAdmin, isSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    const list = await getDepartamentos(session.branchId);
    const scope = isSuperAdmin(session) ? {} : { branchId: session.branchId };
    const groups = await prisma.user.groupBy({
      by: ["department"],
      where: { department: { in: list }, ...scope },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const g of groups) if (g.department) counts[g.department] = g._count._all;
    return NextResponse.json({ departamentos: list, counts });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const input =
      body && Array.isArray(body.departamentos)
        ? body.departamentos
        : body;
    const departamentos: string[] = Array.isArray(input)
      ? input.map((d: unknown) => String(d).trim()).filter((d: string) => d.length > 0)
      : [...DEFAULT_DEPARTAMENTOS];
    const branchId = session.branchId ?? GLOBAL_BRANCH_ID;
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "departamentos" } },
      update: { value: JSON.stringify(departamentos) },
      create: { branchId, key: "departamentos", value: JSON.stringify(departamentos) },
    });
    return NextResponse.json({ departamentos });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}