import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmailNotifications, getCronSecret } from "@/lib/settings";
import { notifyShiftById } from "@/lib/email";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  const expected = await getCronSecret();
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado. Defínelo en Ajustes » Notificaciones." },
      { status: 500 }
    );
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const branches = await prisma.branch.findMany({ select: { id: true } });
  let sent = 0;
  let shiftsToday = 0;

  for (const branch of branches) {
    const cfg = await getEmailNotifications(branch.id);
    if (!cfg.morningEnabled) continue;

    const shifts = await prisma.shift.findMany({
      where: { date: { gte: today, lt: tomorrow }, branchId: branch.id },
      include: { user: { select: { id: true, name: true, email: true, cargo: true, role: true } } },
    });
    shiftsToday += shifts.length;

    for (const s of shifts) {
      if (s.user.role === "admin" || s.user.role === "superadmin") continue;
      if (s.status === "cumplido") continue;
      await notifyShiftById(s.id, "morning");
      sent++;
    }
  }

  return NextResponse.json({ ok: true, shiftsToday, emailsSent: sent });
}
