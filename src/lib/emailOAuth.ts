import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type EmailProvider = "google" | "microsoft";
export type EmailScope = "company" | "branch";

export const EMAIL_OAUTH_PROVIDERS: EmailProvider[] = ["google", "microsoft"];

export const EMAIL_OAUTH_STATE_COOKIE = "email_oauth_state";

export type ProviderReadyResult =
  | { ok: true }
  | { ok: false; error: string; details: string };

/** Comprueba que el proveedor tenga credenciales configuradas en el servidor. */
export function getProviderReady(provider: EmailProvider): ProviderReadyResult {
  if (provider === "google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      return {
        ok: false,
        error: "Gmail no está configurado todavía",
        details: "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor. Regístralas en Google Cloud Console.",
      };
    return { ok: true };
  }
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET)
    return {
      ok: false,
      error: "Outlook no está configurado todavía",
      details: "Faltan OUTLOOK_CLIENT_ID y OUTLOOK_CLIENT_SECRET en el servidor. Regístralas en Azure Entra ID.",
    };
  return { ok: true };
}

/** Forma común de un par de tokens OAuth (compañía o sucursal). */
export interface StoredTokenRow {
  provider: EmailProvider;
  email: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date;
}

export interface CompanyEmailConfigRow extends StoredTokenRow {
  companyId: string;
}

export interface BranchEmailConfigRow extends StoredTokenRow {
  branchId: string;
  companyId: string;
}

interface ProviderSettings {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
}

function encryptionKey(): Buffer {
  const secret = process.env.EMAIL_ENCRYPTION_SECRET;
  if (!secret) {
    console.warn("[emailOAuth] EMAIL_ENCRYPTION_SECRET no configurado; usando clave de desarrollo.");
  }
  return crypto
    .createHash("sha256")
    .update(secret || "dev-encryption-key-change-me")
    .digest();
}

export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload cifrado inválido");
  const key = encryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function getProviderSettings(provider: EmailProvider): ProviderSettings {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/gmail.send",
    };
  }
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID || "",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || "",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access Mail.Send",
  };
}

export async function companyIdFromBranch(branchId?: string | null): Promise<string | null> {
  if (!branchId) return null;
  const b = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  return b?.companyId ?? null;
}

export async function getCompanyEmailConfig(
  companyId?: string | null
): Promise<CompanyEmailConfigRow | null> {
  if (!companyId) return null;
  const row = await prisma.companyEmailConfig.findUnique({ where: { companyId } });
  if (!row) return null;
  return { ...row, provider: row.provider as EmailProvider };
}

export async function getBranchEmailConfig(
  branchId?: string | null
): Promise<BranchEmailConfigRow | null> {
  if (!branchId) return null;
  const row = await prisma.branchEmailConfig.findUnique({ where: { branchId } });
  if (!row) return null;
  return { ...row, provider: row.provider as EmailProvider };
}

export function buildOAuthUrl(
  provider: EmailProvider,
  baseUrl: string,
  state: string
): string {
  const p = getProviderSettings(provider);
  const redirectUri = `${baseUrl}/api/email/connect/${provider}/callback`;
  const qs = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: p.scope,
    state,
  });
  if (provider === "google") {
    qs.set("access_type", "offline");
    qs.set("prompt", "consent");
  } else {
    qs.set("response_mode", "query");
  }
  return `${p.authUrl}?${qs.toString()}`;
}

export async function exchangeCode(
  provider: EmailProvider,
  code: string,
  redirectUri: string
): Promise<Record<string, unknown>> {
  const p = getProviderSettings(provider);
  const form = new URLSearchParams({
    client_id: p.clientId,
    client_secret: p.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  if (provider === "microsoft") form.set("scope", p.scope);

  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`Intercambio de código OAuth falló (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function refreshAccessToken(
  config: StoredTokenRow
): Promise<{ accessToken: string; expiresIn: number }> {
  const p = getProviderSettings(config.provider);
  const form = new URLSearchParams({
    client_id: p.clientId,
    client_secret: p.clientSecret,
    grant_type: "refresh_token",
    refresh_token: decryptSecret(config.refreshTokenEnc),
  });
  if (config.provider === "microsoft") form.set("scope", p.scope);

  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token)
    throw new Error(`Refresh de token falló (${res.status}): ${JSON.stringify(data)}`);
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || 3600 };
}

/**
 * Devuelve un access token fresco (renueva y persiste si caducó).
 * `persist` guarda el nuevo token en la tabla correcta (compañía o sucursal).
 */
export async function ensureFreshAccessToken(
  config: StoredTokenRow,
  persist: (accessTokenEnc: string, expiresAt: Date) => Promise<unknown>
): Promise<{ accessToken: string; email: string }> {
  const fresh = Date.now() < new Date(config.expiresAt).getTime() - 120_000;
  if (fresh)
    return { accessToken: decryptSecret(config.accessTokenEnc), email: config.email };

  const { accessToken, expiresIn } = await refreshAccessToken(config);
  await persist(encryptSecret(accessToken), new Date(Date.now() + expiresIn * 1000));
  return { accessToken, email: config.email };
}

/** Extrae el email del id_token (JWT) que devuelven Google/Microsoft. */
export function extractEmailFromIdToken(idToken?: string | null): string | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
    return payload.email || payload.upn || payload.preferred_username || null;
  } catch {
    return null;
  }
}

/** Codifica el `state` del flujo OAuth con el destino (empresa o sucursal). */
export function buildOAuthState(companyId: string, scope: EmailScope, branchId?: string | null): string {
  return `${companyId}.${scope}.${branchId || ""}.${crypto.randomBytes(16).toString("hex")}`;
}

export interface ParsedOAuthState {
  companyId: string;
  scope: EmailScope;
  branchId: string | null;
}

export function parseOAuthState(state?: string | null): ParsedOAuthState | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length < 4) return null;
  const scope = parts[1] as EmailScope;
  if (scope !== "company" && scope !== "branch") return null;
  return { companyId: parts[0], scope, branchId: parts[2] || null };
}