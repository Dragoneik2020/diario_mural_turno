import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(100),
});

// PATCH: renombrar sucursal (solo superadmin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: { name: parsed.name.trim() },
    });
    return NextResponse.json({ branch });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// DELETE: eliminar sucursal (solo superadmin). Los trabajadores y turnos
// quedan "sin sucursal" (relaciones onDelete: SetNull).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    const branch = await prisma.branch.findUnique({ where: { id: params.id } });
    if (!branch)
      return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
    await prisma.branch.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}