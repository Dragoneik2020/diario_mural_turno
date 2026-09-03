import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requireAdmin,
  canManageRole,
  isDios,
  isMultiBranch,
  branchWhere,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin", "superadmin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
  active: z.boolean().optional(),
  branchId: z.string().optional().nullable(),
  companyId: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const isManager = canManageRole(session.role);
    const isSuper = isMultiBranch(session); // dios y superadmin pueden reasignar sucursales
    const isRoot = isDios(session);
    if (!isManager && session.id !== params.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    if (isManager) {
      const target = await prisma.user.findFirst({
        where: { id: params.id, ...branchWhere(session) },
        select: { id: true },
      });
      if (!target)
        return NextResponse.json(
          { error: "Trabajador no encontrado" },
          { status: 404 }
        );
    }

    const body = await req.json();
    const parsed = userUpdateSchema.parse(body);

    // Solo DIOS puede asignar el rol de super administrador.
    if (parsed.role === "superadmin" && !isRoot)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    if ("branchId" in parsed && !isSuper) delete (parsed as any).branchId;

    if (isSuper && parsed.branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: parsed.branchId,
          ...(session.role === "superadmin"
            ? { companyId: session.companyId ?? "__NONE__" }
            : {}),
        },
      });
      if (!branch)
        return NextResponse.json(
          { error: "Sucursal no encontrada o fuera de tu empresa" },
          { status: 400 }
        );
    }

    // Solo DIOS puede editar el companyId y rol.
    if ("companyId" in parsed && !isRoot) delete (parsed as any).companyId;

    // Un trabajador solo puede editar sus datos básicos.
    if (!isManager) {
      delete (parsed as any).role;
      delete (parsed as any).active;
      delete (parsed as any).cargo;
      delete (parsed as any).branchId;
      delete (parsed as any).companyId;
    }

    const data: any = { ...parsed };
    if (parsed.password) data.password = await bcrypt.hash(parsed.password, 10);
    if ("branchId" in parsed && isSuper)
      data.branchId = parsed.branchId ? parsed.branchId : null;
    if ("companyId" in parsed && isRoot)
      data.companyId = parsed.companyId || null;

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
    const session = await requireAdmin();
    const target = await prisma.user.findFirst({
      where: { id: params.id, ...branchWhere(session) },
      select: { id: true, role: true },
    });
    if (!target)
      return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
    if (target.role === "dios")
      return NextResponse.json(
        { error: "La cuenta DIOS no puede eliminarse" },
        { status: 403 }
      );
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
