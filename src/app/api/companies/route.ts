import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";
import { nom } from "@/lib/normalize";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  name: z.string().trim().min(2).max(100),
  planId: z.string().optional(),
  status: z.enum(["pendiente", "activa", "cancelada"]).optional(),
});

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
  );
}

// POST: crear empresa manualmente (solo DIOS).
export async function POST(req: Request) {
  try {
    await requireDios();
    const body = await req.json();
    const parsed = postSchema.parse(body);

    if (parsed.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: parsed.planId } });
      if (!plan)
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    const slug = `${slugify(parsed.name) || "empresa"}-${Date.now().toString(36)}`;
    const company = await prisma.company.create({
      data: {
        name: nom(parsed.name),
        slug,
        status: parsed.status ?? "activa",
        planId: parsed.planId ?? null,
      },
    });

    // Sucursal inicial para que la empresa sea usable de inmediato.
    await prisma.branch.create({
      data: { name: nom("Sucursal Principal"), companyId: company.id },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireDios();
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { id: true, code: true, name: true } },
        branches: { select: { id: true, name: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true, period: true, paidAt: true, createdAt: true },
        },
        _count: {
          select: {
            branches: true,
            orders: true,
          },
        },
      },
    });
    const withWorkers = await Promise.all(
      companies.map(async (c) => {
        const users = await prisma.user.count({
          where: { branch: { companyId: c.id } },
        });
        return { ...c, workerCount: users };
      })
    );
    return NextResponse.json({ companies: withWorkers });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}