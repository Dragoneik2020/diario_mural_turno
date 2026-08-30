import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["pendiente", "activa", "cancelada"]).optional(),
  planId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const existing = await prisma.company.findUnique({ where: { id: params.id } });
    if (!existing)
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    if (parsed.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: parsed.planId } });
      if (!plan)
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        status: parsed.status,
        planId: parsed.planId !== undefined ? parsed.planId : existing.planId,
      },
    });
    return NextResponse.json({ company });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}