import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createKhipuPayment } from "@/lib/khipu";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  planCode: z.string().min(1),
  period: z.enum(["mensual", "anual"]).default("mensual"),
  companyName: z.string().min(2).max(100),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6).max(100),
});

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.parse(body);

    const plan = await prisma.plan.findFirst({
      where: { code: parsed.planCode, active: true },
    });
    if (!plan)
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

    const existing = await prisma.user.findUnique({
      where: { email: parsed.adminEmail },
    });
    if (existing)
      return NextResponse.json(
        { error: "El email ya está registrado. Usa el acceso con tu cuenta." },
        { status: 409 }
      );

    const base = slugify(parsed.companyName) || "empresa";
    const slug = `${base}-${Date.now().toString(36)}`;

    const origin = req.nextUrl.origin.replace(/\/$/, "");
    const amount =
      parsed.period === "anual" ? plan.priceAnual : plan.priceMensual;

    const company = await prisma.company.create({
      data: { name: parsed.companyName.trim(), slug, status: "pendiente", planId: plan.id },
    });

    const branch = await prisma.branch.create({
      data: { name: "Sucursal Principal", companyId: company.id },
    });

    const password = await bcrypt.hash(parsed.adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        name: parsed.adminName.trim(),
        email: parsed.adminEmail,
        password,
        role: "admin",
        branchId: branch.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        period: parsed.period,
        amount,
      },
    });

    const payment = await createKhipuPayment({
      subject: `Diario de Turnos · Plan ${plan.name} (${parsed.period})`,
      amount,
      transactionId: order.id,
      returnUrl: `${origin}/planes/gracias?orderId=${order.id}`,
      cancelUrl: `${origin}/planes/contratar?plan=${plan.code}&period=${parsed.period}&canceled=1`,
      notifyUrl: `${origin}/api/khipu/webhook`,
      payerEmail: parsed.adminEmail,
      body: parsed.companyName,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        khipuPaymentId: payment.paymentId,
        khipuPaymentUrl: payment.paymentUrl,
      },
    });

    return NextResponse.json(
      {
        orderId: order.id,
        paymentUrl: payment.paymentUrl,
        demo: payment.demo,
        companyId: company.id,
        adminId: admin.id,
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (e.name === "ZodError")
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (e.message === "Khipu token error" || /Khipu/.test(e.message || ""))
      return NextResponse.json(
        { error: "No se pudo iniciar el pago. Intenta de nuevo." },
        { status: 502 }
      );
    return NextResponse.json({ error: "Error al contratar" }, { status: 500 });
  }
}