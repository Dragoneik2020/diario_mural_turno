import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, branchWhere } from "@/lib/session";

export const dynamic = "force-dynamic";

// DELETE encuesta (admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const target = await prisma.poll.findFirst({
      where: { id: params.id, ...branchWhere(session) },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    await prisma.poll.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}