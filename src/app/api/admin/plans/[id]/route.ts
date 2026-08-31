import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";

export const dynamic = "force-dynamic";

const planUpdateSchema = z.object({
  code: z.string().min(2).max(40).optional(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().optional().nullable(),
  priceMensual: z.number().int().min(0).optional(),
  priceAnual: z.number().int().min(0).optional(),
  maxBranches: z.number().int().min(0).optional(),
  maxWorkers: z.number().int().min(0).optional(),
  features: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireDios();
    const body = await req.json();
    const parsed = planUpdateSchema.parse(body);

    if (parsed.code) {
      const dup = await prisma.plan.findFirst({
        where: { code: parsed.code, id: { not: params.id } },
      });
      if (dup)
        return NextResponse.json(
          { error: "Ya existe otro plan con ese código" },
          { status: 409 }
        );
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: parsed,
    });
    return NextResponse.json({ plan });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if ((e as any)?.code === "P2025")
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar el plan" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireDios();
    const companyCount = await prisma.company.count({
      where: { planId: params.id },
    });
    if (companyCount > 0) {
      const companies = await prisma.company.findMany({
        where: { planId: params.id },
        select: { name: true },
        take: 3,
      });
      const names = companies.map((c) => c.name).join(", ");
      return NextResponse.json(
        {
          error: `No se puede eliminar: ${companyCount} empresa(s) usan este plan (${names}). Cambia su plan primero.`,
        },
        { status: 409 }
      );
    }
    await prisma.plan.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al eliminar el plan" }, { status: 500 });
  }
}