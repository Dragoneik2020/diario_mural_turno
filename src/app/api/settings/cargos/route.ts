import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, isMultiBranch, branchWhere } from "@/lib/session";
import { DEFAULT_CARGOS, getCargos, GLOBAL_BRANCH_ID } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const requested = searchParams.get("branchId");

    let branchId = session.branchId;
    if (isMultiBranch(session) && requested) {
      // El superadmin solo puede pedir sucursales de su empresa; dios cualquiera.
      const allowed =
        session.role !== "superadmin" ||
        (
          await prisma.branch.findFirst({
            where: { id: requested, companyId: session.companyId ?? "__NONE__" },
            select: { id: true },
          })
        ) !== null;
      if (allowed) branchId = requested;
    }

    const list = await getCargos(branchId);
    const scope = { ...branchWhere(session) };
    const groups = await prisma.user.groupBy({
      by: ["cargo"],
      where: { cargo: { in: list }, ...scope },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const g of groups) if (g.cargo) counts[g.cargo] = g._count._all;
    return NextResponse.json({ cargos: list, counts });
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
    const input = body && Array.isArray(body.cargos) ? body.cargos : body;
    const cargos: string[] = Array.isArray(input)
      ? input.map((c: unknown) => String(c).trim()).filter((c: string) => c.length > 0)
      : [...DEFAULT_CARGOS];
    const branchId = session.branchId ?? GLOBAL_BRANCH_ID;
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "cargos" } },
      update: { value: JSON.stringify(cargos) },
      create: { branchId, key: "cargos", value: JSON.stringify(cargos) },
    });
    return NextResponse.json({ cargos });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}