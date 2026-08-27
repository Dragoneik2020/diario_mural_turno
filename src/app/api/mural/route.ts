import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, branchWhere } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PollWithVotes {
  id: string;
  question: string;
  createdAt: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
  myVote?: string;
}

export async function GET() {
  try {
    const session = await requireUser();
    const scope = branchWhere(session);
    const announcements = await prisma.announcement.findMany({
      where: { ...scope },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    });

    const pollsRaw = await prisma.poll.findMany({
      where: { active: true, ...scope },
      orderBy: { createdAt: "desc" },
      include: {
        options: { orderBy: { order: "asc" } },
        votes: { select: { userId: true, optionId: true } },
      },
    });

    const polls: PollWithVotes[] = pollsRaw.map((p) => {
      const counts = new Map<string, number>();
      let myVote: string | undefined;
      for (const v of p.votes) {
        counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1);
        if (v.userId === session.id) myVote = v.optionId;
      }
      return {
        id: p.id,
        question: p.question,
        createdAt: p.createdAt.toISOString(),
        totalVotes: p.votes.length,
        myVote,
        options: p.options.map((o) => ({
          id: o.id,
          label: o.label,
          votes: counts.get(o.id) ?? 0,
        })),
      };
    });

    return NextResponse.json({ announcements, polls });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

const pollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = pollSchema.parse(body);

    const poll = await prisma.poll.create({
      data: {
        authorId: session.id,
        branchId: session.branchId ?? null,
        question: parsed.question,
        options: {
          create: parsed.options.map((label, i) => ({ label, order: i })),
        },
      },
    });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
