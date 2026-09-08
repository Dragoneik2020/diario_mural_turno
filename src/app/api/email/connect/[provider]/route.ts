import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authorizeBranchScope, authorizeCompanyScope } from "@/lib/emailConfigScope";
import {
  buildOAuthState,
  buildOAuthUrl,
  EMAIL_OAUTH_PROVIDERS,
  EMAIL_OAUTH_STATE_COOKIE,
  EmailProvider,
  EmailScope,
  getProviderReady,
} from "@/lib/emailOAuth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const session = await requireAdmin();
    const provider = params.provider as EmailProvider;
    if (!EMAIL_OAUTH_PROVIDERS.includes(provider))
      return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });

    const pb = getProviderReady(provider);
    if (!pb.ok)
      return NextResponse.json({ error: pb.error, details: pb.details }, { status: 503 });

    const { searchParams } = new URL(_req.url);
    const scope = (searchParams.get("scope") || "company") as EmailScope;
    const requestedBranchId = searchParams.get("branchId");

    let companyId: string | null;
    let branchId: string | null = null;

    if (scope === "branch") {
      branchId = await authorizeBranchScope(session, requestedBranchId);
      if (!branchId)
        return NextResponse.json({ error: "No autorizado para esa sucursal" }, { status: 403 });
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { companyId: true },
      });
      companyId = branch?.companyId ?? null;
    } else {
      companyId = authorizeCompanyScope(session);
    }

    if (!companyId)
      return NextResponse.json(
        { error: "No tienes empresa asociada. Para DIOS: entra en modo empresa." },
        { status: 400 }
      );

    const state = buildOAuthState(companyId, scope, branchId);
    const origin = new URL(_req.url).origin;
    cookies().set(EMAIL_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/email/connect",
      maxAge: 10 * 60,
    });

    const url = buildOAuthUrl(provider, origin, state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al iniciar conexión" }, { status: 500 });
  }
}