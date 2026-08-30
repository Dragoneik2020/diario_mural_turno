import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKhipuPaymentStatus, khipuConfigured } from "@/lib/khipu";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const paymentId = String(form.get("payment_id") ?? "");
    const notificationToken = String(form.get("notification_token") ?? "");
    const apiVersion = String(form.get("api_version") ?? "");

    if (!paymentId || !notificationToken)
      return new NextResponse("Missing fields", { status: 400 });

    // Sin credenciales no hay webhooks reales (modo demo usa /demo-pay).
    if (!khipuConfigured()) return new NextResponse("Demo mode", { status: 200 });

    const order = await prisma.order.findFirst({ where: { khipuPaymentId: paymentId } });
    if (!order) return new NextResponse("Order not found", { status: 404 });

    if (order.status === "pagado" || order.status === "reembolsado")
      return new NextResponse("Already processed", { status: 200 });

    // Verifica el pago con el token de un solo uso enviado por Khipu.
    const { status } = await getKhipuPaymentStatus(paymentId, notificationToken);

    if (status === "done") {
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
      return new NextResponse("OK", { status: 200 });
    }

    if (["failed", "rejected", "aborted", "refunded"].includes(status)) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "fallido" },
      });
    }

    return new NextResponse(apiVersion ? "OK" : "OK", { status: 200 });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}