import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const annSchema = z.object({
  content: z.string().min(1).max(2000),
  pinned: z.boolean().optional(),
});

// GET: lista de anuncios (todos los autenticados)
export async function GET() {
  try {
    await requireUser();
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    });
    return NextResponse.json({ announcements });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// POST: crear anuncio (solo admin)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = annSchema.parse(body);
    const ann = await prisma.announcement.create({
      data: {
        authorId: session.id,
        content: parsed.content,
        pinned: parsed.pinned ?? false,
      },
      include: { author: { select: { name: true } } },
    });
    return NextResponse.json({ announcement: ann }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
