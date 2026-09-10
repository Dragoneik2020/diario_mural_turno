import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canManageRole, branchWhere } from "@/lib/session";
import { notifyShiftById } from "@/lib/email";
import { nom, txt } from "@/lib/normalize";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  type: z.string().trim().min(1).max(40).optional(),
  name: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["asignado", "confirmado", "cumplido"]).optional(),
});

function combine(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const shift = await prisma.shift.findFirst({
      where: { id: params.id, ...branchWhere(session) },
    });
    if (!shift)
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const isAdmin = canManageRole(session.role);
    if (!isAdmin && shift.userId !== session.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.parse(body);

    // Reglas de estado:
    // - Admin puede poner cualquier estado.
    // - Trabajador solo puede confirmar (confirmado) o marcar cumplido (cumplido).
    if (parsed.status && !isAdmin) {
      if (parsed.status === "asignado") {
        return NextResponse.json(
          { error: "No puedes volver a marcar como asignado" },
          { status: 403 }
        );
      }
    }

    const data: any = {};
    const timeOf = (d: Date) => d.toTimeString().slice(0, 5);
    if (parsed.start !== undefined || parsed.end !== undefined || parsed.date !== undefined) {
      const day = (parsed.date || shift.date.toISOString().slice(0, 10)).slice(0, 10);
      const tStart = parsed.start !== undefined ? parsed.start : timeOf(shift.start);
      const tEnd = parsed.end !== undefined ? parsed.end : timeOf(shift.end);
      const s = combine(day, tStart);
      let e = combine(day, tEnd);
      if (e <= s) e = new Date(e.getTime() + 86400000); // turno nocturno: cruza al día siguiente
      data.start = s;
      data.end = e;
      data.date = s;
    }
    if (parsed.type) data.type = parsed.type;
    if (parsed.name !== undefined) data.name = parsed.name ? nom(parsed.name) : "";
    if (parsed.notes !== undefined) data.notes = parsed.notes ? txt(parsed.notes) : "";
    if (parsed.status) data.status = parsed.status;

    const updated = await prisma.shift.update({
      where: { id: params.id },
      data,
      include: { user: { select: { id: true, name: true, department: true } } },
    });

    if (isAdmin && parsed.status === "asignado") void notifyShiftById(params.id);

    return NextResponse.json({ shift: updated });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const shift = await prisma.shift.findFirst({
      where: { id: params.id, ...branchWhere(session) },
    });
    if (!shift)
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const isAdmin = canManageRole(session.role);
    if (!isAdmin && shift.userId !== session.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.shift.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
