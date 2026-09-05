import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { sendPushToUser, pushConfigured } from "@/lib/push";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await requireUser();
    if (!pushConfigured()) {
      return NextResponse.json(
        { error: "Push no configurado en el servidor (faltan claves VAPID)" },
        { status: 503 }
      );
    }
    const count = await prisma.pushSubscription.count({ where: { userId: session.id } });
    if (count === 0) {
      return NextResponse.json(
        { error: "Este dispositivo aún no está suscrito. Presiona Activar notificaciones." },
        { status: 400 }
      );
    }
    await sendPushToUser(session.id, {
      title: "Diario de Turnos",
      body: "Prueba correcta: recibirás aquí tus avisos de turnos.",
      url: "/dashboard",
      tag: "push-test",
    });
    return NextResponse.json({ ok: true, devices: count });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo enviar la prueba" }, { status: 500 });
  }
}
