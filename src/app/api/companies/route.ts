import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireDios();
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { id: true, code: true, name: true } },
        branches: { select: { id: true, name: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true, period: true, paidAt: true, createdAt: true },
        },
        _count: {
          select: {
            branches: true,
            orders: true,
          },
        },
      },
    });
    const withWorkers = await Promise.all(
      companies.map(async (c) => {
        const users = await prisma.user.count({
          where: { branch: { companyId: c.id } },
        });
        return { ...c, workerCount: users };
      })
    );
    return NextResponse.json({ companies: withWorkers });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}