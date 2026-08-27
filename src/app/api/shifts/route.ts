import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canManageRole, branchWhere } from "@/lib/session";
import { notifyShiftById } from "@/lib/email";

export const dynamic = "force-dynamic";



const shiftSchema = z.object({
  userId: z.string().optional(),
  date: z.string(), // ISO date (YYYY-MM-DD)
  start: z.string(), // HH:mm
  end: z.string(), // HH:mm
  type: z.enum(["manana", "tarde", "noche", "completo", "otro"]).default("completo"),
  name: z.string().optional(),
  notes: z.string().optional(),
});

function combine(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const userIdParam = searchParams.get("userId");

    const where: any = { ...branchWhere(session) };
    if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
    if (to) where.date = { ...(where.date || {}), lte: new Date(to) };

    if (canManageRole(session.role)) {
      if (userIdParam) where.userId = userIdParam;
    } else {
      where.userId = session.id;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: { user: { select: { id: true, name: true, department: true } } },
      orderBy: { start: "desc" },
    });

    return NextResponse.json({ shifts });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al obtener turnos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = shiftSchema.parse(body);

    const isManager = canManageRole(session.role);

    let userId = session.id;
    let branchId = session.branchId ?? null;
    if (isManager && parsed.userId) {
      const target = await prisma.user.findUnique({
        where: { id: parsed.userId },
        select: { id: true, branchId: true },
      });
      if (!target)
        return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
      if (session.role !== "superadmin" && target.branchId !== session.branchId) {
        return NextResponse.json(
          { error: "Solo puedes asignar turnos a tu sucursal" },
          { status: 403 }
        );
      }
      userId = target.id;
      branchId = target.branchId ?? session.branchId ?? null;
    }

    const start = combine(parsed.date, parsed.start);
    const end = combine(parsed.date, parsed.end);
    if (end <= start) {
      return NextResponse.json(
        { error: "La hora de fin debe ser posterior a la de inicio" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        branchId,
        date: start,
        start,
        end,
        type: parsed.type as string,
        name: parsed.name,
        status: isManager && parsed.userId ? "asignado" : "confirmado",
        notes: parsed.notes,
      },
      include: { user: { select: { id: true, name: true, department: true } } },
    });

    if (shift.status === "asignado") void notifyShiftById(shift.id);

    return NextResponse.json({ shift }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos", details: e.errors }, { status: 400 });
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al crear turno" }, { status: 500 });
  }
}
