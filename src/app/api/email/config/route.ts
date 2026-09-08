import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authorizeBranchScope, authorizeCompanyScope } from "@/lib/emailConfigScope";
import type { EmailScope } from "@/lib/emailOAuth";

export const dynamic = "force-dynamic";

// DELETE /api/email/config?scope=company|branch&branchId=...
// Elimina la conexión de correo saliente a nivel empresa o sucursal.
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") || "company") as EmailScope;
    const branchId = searchParams.get("branchId");

    if (scope === "branch") {
      const allowed = await authorizeBranchScope(session, branchId);
      if (!allowed)
        return NextResponse.json({ error: "No autorizado para esa sucursal" }, { status: 403 });
      await prisma.branchEmailConfig.deleteMany({ where: { branchId: allowed } });
      return NextResponse.json({ ok: true });
    }

    const companyId = authorizeCompanyScope(session);
    if (!companyId)
      return NextResponse.json(
        { error: "No tienes empresa asociada. Para DIOS: entra en modo empresa." },
        { status: 400 }
      );
    await prisma.companyEmailConfig.deleteMany({ where: { companyId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}