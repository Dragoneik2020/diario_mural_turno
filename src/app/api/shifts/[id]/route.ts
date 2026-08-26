import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notifyShiftById } from "@/lib/email";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  type: z.enum(["manana", "tarde", "noche", "completo", "otro"]).optional(),
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
    const shift = await prisma.shift.findUnique({ where: { id: params.id } });
    if (!shift)
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const isAdmin = session.role === "admin";
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
    const baseDate = parsed.date || shift.date.toISOString().slice(0, 10);
    const timeOf = (d: Date) => d.toTimeString().slice(0, 5);
    if (parsed.start) data.start = combine(baseDate, parsed.start);
    if (parsed.end) data.end = combine(baseDate, parsed.end);
    if (parsed.date) {
      const tStart = parsed.start || timeOf(shift.start);
      const tEnd = parsed.end || timeOf(shift.end);
      data.date = combine(baseDate, tStart);
      if (!parsed.start) data.start = combine(baseDate, tStart);
      if (!parsed.end) data.end = combine(baseDate, tEnd);
    }
    if (parsed.type) data.type = parsed.type;
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.notes !== undefined) data.notes = parsed.notes;
    if (parsed.status) data.status = parsed.status;

    if (data.start && data.end && data.end <= data.start) {
      return NextResponse.json({ error: "Horas inválidas" }, { status: 400 });
    }

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
    const shift = await prisma.shift.findUnique({ where: { id: params.id } });
    if (!shift)
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const isAdmin = session.role === "admin";
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
