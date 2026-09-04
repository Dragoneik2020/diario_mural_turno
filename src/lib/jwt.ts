import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production");
  }
  return new TextEncoder().encode(value || "dev-secret-change-me-please");
}

export const SESSION_COOKIE = "dt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AppRole = "worker" | "admin" | "superadmin" | "dios";

export interface Session {
  id: string;
  name: string;
  email: string;
  rut?: string | null;
  role: AppRole;
  department?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  companyId?: string | null;
}

export async function createToken(session: Session): Promise<string> {
  return new SignJWT({
    id: session.id,
    name: session.name,
    email: session.email,
    rut: session.rut ?? null,
    role: session.role,
    department: session.department ?? null,
    branchId: session.branchId ?? null,
    branchName: session.branchName ?? null,
    companyId: session.companyId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      rut: (payload.rut as string | null) ?? null,
      role: payload.role as AppRole,
      department: (payload.department as string | null) ?? null,
      branchId: (payload.branchId as string | null) ?? null,
      branchName: (payload.branchName as string | null) ?? null,
      companyId: (payload.companyId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
