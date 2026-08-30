import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { priceMensual: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      priceMensual: true,
      priceAnual: true,
      maxBranches: true,
      maxWorkers: true,
      features: true,
    },
  });
  return NextResponse.json({ plans });
}