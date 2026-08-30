import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSuperAdmin, branchWhere } from "@/lib/session";

export const dynamic = "force-dynamic";

const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["worker", "admin", "superadmin"]).default("worker"),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().default(true),
  branchId: z.string().optional(),
});

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin", "superadmin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().optional(),
  branchId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireAdmin();
    const users = await prisma.user.findMany({
      where: { ...branchWhere(session) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        cargo: true,
        active: true,
        branchId: true,
        createdAt: true,
        _count: { select: { shifts: true } },
      },
    });
    return NextResponse.json({ users });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = userCreateSchema.parse(body);

    const isSuper = isSuperAdmin(session);
    if (parsed.role === "superadmin" && !isSuper)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (exists)
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });

    const branchId =
      isSuper && parsed.branchId ? parsed.branchId : session.branchId ?? null;

    // Límite de trabajadores del plan de la empresa (si aplica).
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { company: { include: { plan: true } } },
      });
      const company = branch?.company;
      if (company && company.plan && company.plan.maxWorkers > 0) {
        const count = await prisma.user.count({
          where: { branch: { companyId: company.id } },
        });
        if (count >= company.plan.maxWorkers)
          return NextResponse.json(
            {
              error: `Límite del plan alcanzado (${company.plan.maxWorkers} trabajadores).`,
            },
            { status: 403 }
          );
      }
    }

    const password = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        password,
        role: parsed.role,
        department: parsed.department,
        cargo: parsed.cargo,
        active: parsed.active,
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        cargo: true,
        active: true,
        branchId: true,
      },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
