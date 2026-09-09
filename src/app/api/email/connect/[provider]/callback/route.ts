import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  EMAIL_OAUTH_PROVIDERS,
  EMAIL_OAUTH_STATE_COOKIE,
  EmailProvider,
  encryptSecret,
  exchangeCode,
  extractEmailFromIdToken,
  getRequestOrigin,
  parseOAuthState,
} from "@/lib/emailOAuth";

export const dynamic = "force-dynamic";

function getRedirectUri(origin: string, provider: EmailProvider): string {
  return `${origin}/api/email/connect/${provider}/callback`;
}

async function fetchIdTokenClaims(provider: EmailProvider, accessToken: string): Promise<string | null> {
  if (provider === "google") {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || data.id || null;
  }
  return null;
}

async function fetchEmailFromTokenInfo(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as EmailProvider;
  if (!EMAIL_OAUTH_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });
  }
  const base = getRequestOrigin(req) || req.url;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/admin/notificaciones?email=error:${encodeURIComponent(errorParam)}`, base)
    );
  }

  const savedState = cookies().get(EMAIL_OAUTH_STATE_COOKIE)?.value;
  cookies().delete(EMAIL_OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/admin/notificaciones?email=error:invalid_state", base)
    );
  }

  const parsed = parseOAuthState(state);
  if (!parsed || !parsed.companyId) {
    return NextResponse.redirect(
      new URL("/admin/notificaciones?email=error:invalid_company", base)
    );
  }

  try {
    const redirectUri = getRedirectUri(getRequestOrigin(req), provider);
    const tokens = (await exchangeCode(provider, code, redirectUri)) as Record<string, any>;

    const accessToken: string = tokens.access_token;
    const refreshToken: string = tokens.refresh_token;
    const idToken: string | null = (tokens.id_token as string) || null;
    const expiresIn = Number(tokens.expires_in) || 3600;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/admin/notificaciones?email=error:no_token", base)
      );
    }

    const emailFromToken = extractEmailFromIdToken(idToken);
    const emailFromApi = await fetchIdTokenClaims(provider, accessToken);
    const emailFromInfo = emailFromToken || emailFromApi ? null : await fetchEmailFromTokenInfo(accessToken);
    const accountEmail = emailFromToken || emailFromApi || emailFromInfo;

    // Si el proveedor no devuelve refresh_token (Google solo en el primer
    // consent), conserva el existente para no romper renovaciones.
    let existingRefresh = "";
    if (parsed.scope === "branch" && parsed.branchId) {
      const row = await prisma.branchEmailConfig.findUnique({
        where: { branchId: parsed.branchId },
      });
      if (row) existingRefresh = decryptSecret(row.refreshTokenEnc);
    } else {
      const row = await prisma.companyEmailConfig.findUnique({
        where: { companyId: parsed.companyId },
      });
      if (row) existingRefresh = decryptSecret(row.refreshTokenEnc);
    }
    const finalRefreshToken = refreshToken || existingRefresh;

    if (!accountEmail || !finalRefreshToken) {
      return NextResponse.redirect(
        new URL("/admin/notificaciones?email=error:no_account_email", base)
      );
    }

    const tokenData = {
      provider,
      email: accountEmail,
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: encryptSecret(finalRefreshToken),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };

    if (parsed.scope === "branch" && parsed.branchId) {
      await prisma.branchEmailConfig.upsert({
        where: { branchId: parsed.branchId },
        create: {
          branchId: parsed.branchId,
          companyId: parsed.companyId,
          ...tokenData,
        },
        update: tokenData,
      });
    } else {
      await prisma.companyEmailConfig.upsert({
        where: { companyId: parsed.companyId },
        create: { companyId: parsed.companyId, ...tokenData },
        update: tokenData,
      });
    }

    return NextResponse.redirect(
      new URL("/admin/notificaciones?email=connected", base)
    );
  } catch (e: any) {
    console.error("[emailOAuth] callback falló:", e?.message || e);
    return NextResponse.redirect(
      new URL(`/admin/notificaciones?email=error:${encodeURIComponent(e?.message || "unknown")}`, base)
    );
  }
}