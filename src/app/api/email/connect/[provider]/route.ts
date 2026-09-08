import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { isDios, diosCompanyScope, requireCompanyManager } from "@/lib/session";
import type { Session } from "@/lib/auth";
import {
  buildOAuthUrl,
  EMAIL_OAUTH_PROVIDERS,
  EMAIL_OAUTH_STATE_COOKIE,
  EmailProvider,
  getProviderReady,
} from "@/lib/emailOAuth";

export const dynamic = "force-dynamic";

function resolveCompanyId(session: Session): string | null {
  if (isDios(session)) return diosCompanyScope();
  return session.companyId ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const session = await requireCompanyManager();
    const provider = params.provider as EmailProvider;
    if (!EMAIL_OAUTH_PROVIDERS.includes(provider))
      return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });

    const pb = getProviderReady(provider);
    if (!pb.ok)
      return NextResponse.json(
        { error: pb.error, details: pb.details },
        { status: 503 }
      );

    const companyId = resolveCompanyId(session);
    if (!companyId)
      return NextResponse.json(
        { error: "No tienes empresa asociada. Para DIOS: entra en modo empresa." },
        { status: 400 }
      );

    const state = `${companyId}.${randomBytes(16).toString("hex")}`;
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