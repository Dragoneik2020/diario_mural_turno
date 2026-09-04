import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const input = subscriptionSchema.parse(await req.json());
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: { userId: session.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
      create: {
        userId: session.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, subscriptionId: subscription.id });
  } catch (error: any) {
    if (error?.name === "ZodError") return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    if (error?.message === "UNAUTHENTICATED") return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo activar las notificaciones" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser();
    const endpoint = new URL(req.url).searchParams.get("endpoint");
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "UNAUTHENTICATED") return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo desactivar" }, { status: 500 });
  }
}
