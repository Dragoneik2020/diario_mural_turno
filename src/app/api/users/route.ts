import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["worker", "admin"]).default("worker"),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().default(true),
});

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        cargo: true,
        active: true,
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
    await requireAdmin();
    const body = await req.json();
    const parsed = userCreateSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (exists)
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });

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
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        cargo: true,
        active: true,
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
