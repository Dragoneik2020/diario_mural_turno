import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import {
  DEFAULT_SHIFT_TYPE_LABELS,
  DEFAULT_SHIFT_TYPE_SCHEDULES,
  SHIFT_TYPE_KEYS,
  getShiftTypeLabels,
  getShiftTypeSchedules,
  GLOBAL_BRANCH_ID,
} from "@/lib/settings";
import { nom } from "@/lib/normalize";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  try {
    const session = await requireUser();
    const [labels, schedules] = await Promise.all([
      getShiftTypeLabels(session.branchId),
      getShiftTypeSchedules(session.branchId),
    ]);
    return NextResponse.json({ labels, schedules });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    // Compatibilidad con el formato antiguo: si no vienen los objetos
    // `labels`/`schedules`, el cuerpo completo se interpreta como labels.
    const labelsInput =
      body && typeof body.labels === "object"
        ? body.labels
        : body && typeof body.schedules !== "object"
          ? body
          : {};
    const schedulesInput = body && typeof body.schedules === "object" ? body.schedules : {};

    const labels: Record<string, string> = { ...DEFAULT_SHIFT_TYPE_LABELS };
    for (const k of SHIFT_TYPE_KEYS) {
      if (labelsInput && typeof labelsInput[k] === "string" && labelsInput[k].trim())
        labels[k] = nom(labelsInput[k]);
    }

    const schedules: Record<string, { start: string; end: string }> = {
      ...DEFAULT_SHIFT_TYPE_SCHEDULES,
    };
    for (const k of SHIFT_TYPE_KEYS) {
      const v = schedulesInput[k];
      if (v && typeof v === "object" && typeof v.start === "string" && typeof v.end === "string") {
        if (TIME_RE.test(v.start.trim()) && TIME_RE.test(v.end.trim())) {
          schedules[k] = { start: v.start.trim(), end: v.end.trim() };
        }
      }
    }

    const branchId = session.branchId ?? GLOBAL_BRANCH_ID;
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "shiftTypeLabels" } },
      update: { value: JSON.stringify(labels) },
      create: { branchId, key: "shiftTypeLabels", value: JSON.stringify(labels) },
    });
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "shiftTypeSchedules" } },
      update: { value: JSON.stringify(schedules) },
      create: { branchId, key: "shiftTypeSchedules", value: JSON.stringify(schedules) },
    });
    return NextResponse.json({ labels, schedules });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}