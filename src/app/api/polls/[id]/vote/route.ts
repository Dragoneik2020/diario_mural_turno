import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const voteSchema = z.object({
  optionId: z.string().min(1),
});

// POST votar / cambiar voto en una encuesta
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = voteSchema.parse(body);

    const poll = await prisma.poll.findUnique({ where: { id: params.id } });
    if (!poll || !poll.active)
      return NextResponse.json({ error: "Encuesta no disponible" }, { status: 404 });

    const option = await prisma.pollOption.findFirst({
      where: { id: parsed.optionId, pollId: params.id },
    });
    if (!option)
      return NextResponse.json({ error: "Opción inválida" }, { status: 400 });

    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId: params.id, userId: session.id } },
      create: { pollId: params.id, optionId: parsed.optionId, userId: session.id },
      update: { optionId: parsed.optionId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al votar" }, { status: 500 });
  }
}
