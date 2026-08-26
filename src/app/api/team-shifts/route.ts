import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {};
    if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
    if (to) where.date = { ...(where.date || {}), lte: new Date(to) };

    const shifts = await prisma.shift.findMany({
      where,
      include: { user: { select: { id: true, name: true, department: true, cargo: true } } },
      orderBy: { start: "asc" },
    });

    return NextResponse.json({ shifts });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al obtener turnos" }, { status: 500 });
  }
}
