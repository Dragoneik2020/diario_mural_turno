import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManageRole, effectiveCompanyId } from "@/lib/session";
import { getPersonalMetrics, getGlobalMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const range = parseInt(searchParams.get("range") || "30", 10);

    if (canManageRole(session.role)) {
      const metrics = await getGlobalMetrics(
        range,
        session.branchId,
        effectiveCompanyId(session)
      );
      return NextResponse.json({ scope: "global", metrics });
    } else {
      const metrics = await getPersonalMetrics(session.id, range, session.branchId);
      return NextResponse.json({ scope: "personal", metrics });
    }
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error al obtener métricas" }, { status: 500 });
  }
}
