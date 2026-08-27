import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-please"
);

export const SESSION_COOKIE = "dt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AppRole = "worker" | "admin" | "superadmin";

export interface Session {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  department?: string | null;
  branchId?: string | null;
  branchName?: string | null;
}

export async function createToken(session: Session): Promise<string> {
  return new SignJWT({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    department: session.department ?? null,
    branchId: session.branchId ?? null,
    branchName: session.branchName ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as AppRole,
      department: (payload.department as string | null) ?? null,
      branchId: (payload.branchId as string | null) ?? null,
      branchName: (payload.branchName as string | null) ?? null,
    };
  } catch {
    return null;
  }
}