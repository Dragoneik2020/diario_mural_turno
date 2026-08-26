import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const isAdmin = session.role === "admin";
    if (!isAdmin && session.id !== params.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const parsed = userUpdateSchema.parse(body);

    // Un trabajador solo puede editar sus datos básicos.
    if (!isAdmin) {
      delete (parsed as any).role;
      delete (parsed as any).active;
      delete (parsed as any).cargo;
    }

    const data: any = { ...parsed };
    if (parsed.password) data.password = await bcrypt.hash(parsed.password, 10);

    if (parsed.email) {
      const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (exists && exists.id !== params.id)
        return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
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
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
