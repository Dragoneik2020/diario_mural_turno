import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";

export const dynamic = "force-dynamic";

const planSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(80),
  description: z.string().optional().nullable(),
  priceMensual: z.number().int().min(0),
  priceAnual: z.number().int().min(0),
  maxBranches: z.number().int().min(0),
  maxWorkers: z.number().int().min(0),
  features: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireDios();
    const plans = await prisma.plan.findMany({
      orderBy: { priceMensual: "asc" },
      include: { _count: { select: { companies: true } } },
    });
    return NextResponse.json({ plans });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDios();
    const body = await req.json();
    const parsed = planSchema.parse(body);

    const exists = await prisma.plan.findUnique({ where: { code: parsed.code } });
    if (exists)
      return NextResponse.json({ error: "Ya existe un plan con ese código" }, { status: 409 });

    const plan = await prisma.plan.create({
      data: {
        code: parsed.code,
        name: parsed.name,
        description: parsed.description ?? null,
        priceMensual: parsed.priceMensual,
        priceAnual: parsed.priceAnual,
        maxBranches: parsed.maxBranches,
        maxWorkers: parsed.maxWorkers,
        features: parsed.features ?? null,
        active: parsed.active ?? true,
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear el plan" }, { status: 500 });
  }
}