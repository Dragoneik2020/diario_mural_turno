import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin, isSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const branchSchema = z.object({
  name: z.string().min(2).max(100),
});

// GET: sucursales. El superadmin ve todas; el admin de sucursal solo la suya.
export async function GET() {
  try {
    const session = await requireAdmin();
    const branches = await prisma.branch.findMany({
      where: isSuperAdmin(session) ? {} : { id: session.branchId ?? "__NONE__" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, shifts: true } },
      },
    });
    return NextResponse.json({ branches });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// POST: crear sucursal (solo superadmin)
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const parsed = branchSchema.parse(body);
    const branch = await prisma.branch.create({ data: { name: parsed.name.trim() } });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}