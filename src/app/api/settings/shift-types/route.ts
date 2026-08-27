import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import {
  DEFAULT_SHIFT_TYPE_LABELS,
  SHIFT_TYPE_KEYS,
  getShiftTypeLabels,
  GLOBAL_BRANCH_ID,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    const labels = await getShiftTypeLabels(session.branchId);
    return NextResponse.json({ labels });
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
    const input = body && typeof body.labels === "object" ? body.labels : body;
    const labels: Record<string, string> = { ...DEFAULT_SHIFT_TYPE_LABELS };
    for (const k of SHIFT_TYPE_KEYS) {
      if (input && typeof input[k] === "string" && input[k].trim()) labels[k] = input[k].trim();
    }
    const branchId = session.branchId ?? GLOBAL_BRANCH_ID;
    await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: "shiftTypeLabels" } },
      update: { value: JSON.stringify(labels) },
      create: { branchId, key: "shiftTypeLabels", value: JSON.stringify(labels) },
    });
    return NextResponse.json({ labels });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}