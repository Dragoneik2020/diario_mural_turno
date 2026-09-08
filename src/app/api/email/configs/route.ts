import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  isDios,
  isSuperAdmin,
  isMultiBranch,
  diosCompanyScope,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/email/configs
// Estado de conexión de correo saliente: a nivel empresa y por sucursal.
export async function GET() {
  try {
    const session = await requireAdmin();

    const branches = await prisma.branch.findMany({
      where: {
        ...(isMultiBranch(session) ? {} : { id: session.branchId ?? "__NONE__" }),
        ...(isDios(session) && !diosCompanyScope()
          ? {}
          : { companyId: isDios(session) ? diosCompanyScope() ?? "__NONE__" : session.companyId ?? "__NONE__" }),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, companyId: true },
    });

    const branchIds = branches.map((b) => b.id);
    const branchConfs = await prisma.branchEmailConfig.findMany({
      where: { branchId: { in: branchIds } },
    });
    const confMap = new Map(branchConfs.map((c) => [c.branchId, c]));

    let company: { connected: boolean; provider?: string; email?: string } | null = null;
    if (isSuperAdmin(session) || isDios(session)) {
      const companyId = isDios(session) ? diosCompanyScope() : session.companyId;
      if (companyId) {
        const cc = await prisma.companyEmailConfig.findUnique({ where: { companyId } });
        company = cc
          ? { connected: true, provider: cc.provider, email: cc.email }
          : { connected: false };
      }
    }

    return NextResponse.json({
      company,
      branches: branches.map((b) => {
        const c = confMap.get(b.id);
        return {
          id: b.id,
          name: b.name,
          connected: !!c,
          provider: c?.provider,
          email: c?.email,
        };
      }),
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}