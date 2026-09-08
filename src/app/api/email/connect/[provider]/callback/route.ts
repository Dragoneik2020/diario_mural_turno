import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_OAUTH_PROVIDERS,
  EMAIL_OAUTH_STATE_COOKIE,
  decryptSecret,
  EmailProvider,
  encryptSecret,
  exchangeCode,
  extractEmailFromIdToken,
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

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as EmailProvider;
  if (!EMAIL_OAUTH_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/admin/notificaciones?email=error:${encodeURIComponent(errorParam)}`, req.url)
    );
  }

  const savedState = cookies().get(EMAIL_OAUTH_STATE_COOKIE)?.value;
  cookies().delete(EMAIL_OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/admin/notificaciones?email=error:invalid_state", req.url)
    );
  }

  const companyId = state.split(".")[0];
  if (!companyId) {
    return NextResponse.redirect(
      new URL("/admin/notificaciones?email=error:invalid_company", req.url)
    );
  }

  try {
    const redirectUri = getRedirectUri(new URL(req.url).origin, provider);
    const tokens = (await exchangeCode(provider, code, redirectUri)) as Record<string, any>;

    const accessToken: string = tokens.access_token;
    const refreshToken: string = tokens.refresh_token;
    const idToken: string | null = (tokens.id_token as string) || null;
    const expiresIn = Number(tokens.expires_in) || 3600;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/admin/notificaciones?email=error:no_token", req.url)
      );
    }

    const emailFromToken = extractEmailFromIdToken(idToken);
    const emailFromApi = await fetchIdTokenClaims(provider, accessToken);
    const accountEmail = emailFromToken || emailFromApi;

    // Si Google no devuelve refresh_token (solo en el primer consent),
    // conserva el existente para no romper renovaciones.
    const existing = await prisma.companyEmailConfig.findUnique({ where: { companyId } });
    const finalRefreshToken = refreshToken || (existing ? decryptSecret(existing.refreshTokenEnc) : "");

    if (!accountEmail || !finalRefreshToken) {
      return NextResponse.redirect(
        new URL(
          "/admin/notificaciones?email=error:no_account_email",
          req.url
        )
      );
    }

    await prisma.companyEmailConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        provider,
        email: accountEmail,
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: encryptSecret(finalRefreshToken),
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
      update: {
        provider,
        email: accountEmail,
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: encryptSecret(finalRefreshToken),
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return NextResponse.redirect(
      new URL(`/admin/notificaciones?email=connected`, req.url)
    );
  } catch (e: any) {
    console.error("[emailOAuth] callback fallÃ³:", e?.message || e);
    return NextResponse.redirect(
      new URL(`/admin/notificaciones?email=error:${encodeURIComponent(e?.message || "unknown")}`, req.url)
    );
  }
}
