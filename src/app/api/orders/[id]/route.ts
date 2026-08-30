import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      plan: { select: { code: true, name: true } },
      company: { select: { id: true, name: true, status: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    status: order.status,
    period: order.period,
    planName: order.plan.name,
    companyName: order.company.name,
    companyStatus: order.company.status,
    khipuPaymentId: order.khipuPaymentId,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  });
}