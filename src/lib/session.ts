import { getSession, type Session } from "./auth";

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export function canManageRole(role?: string): boolean {
  return role === "admin" || role === "superadmin";
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (!canManageRole(session.role)) throw new Error("FORBIDDEN");
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "superadmin") throw new Error("FORBIDDEN");
  return session;
}

export function isAdmin(session: Session | null): boolean {
  return canManageRole(session?.role);
}

export function isSuperAdmin(session: Session | null): boolean {
  return session?.role === "superadmin";
}

/**
 * Fragment `where` para acotar consultas a la sucursal de la sesión.
 * El superadmin no tiene filtro (ve todas); los demás solo su sucursal.
 * Una sesión sin sucursal (legacy/corrupta) no ve nada, nunca todo.
 */
export function branchWhere(session: Session): { branchId?: string } {
  if (isSuperAdmin(session)) return {};
  return { branchId: session.branchId ?? "__NONE__" };
}

/** Sucursal destino para escrituras. El superadmin escribe en el ámbito global. */
export function writeBranchId(session: Session): string | null {
  return session.branchId ?? null;
}