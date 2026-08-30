import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { khipuConfigured } from "@/lib/khipu";

export const dynamic = "force-dynamic";

// Simula la aprobación de un pago hecho en modo demo (sin credenciales Khipu).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { company: { select: { id: true, status: true } } },
    });
    if (!order)
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    if (!khipuConfigured() || (order.khipuPaymentId ?? "").startsWith("demo-")) {
      if (order.status === "pagado")
        return NextResponse.json({ message: "Ya pagada", demo: true });

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (order.period === "anual" ? 365 : 30));
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "pagado", paidAt: now },
        }),
        prisma.company.update({
          where: { id: order.companyId },
          data: { status: "activa", currentPeriodEnd: end },
        }),
      ]);
      return NextResponse.json({ message: "Pago simulado correctamente", demo: true });
    }

    return NextResponse.json(
      { error: "Esta orden usa pago real; no se puede simular." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}