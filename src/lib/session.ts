import { getSession, type Session } from "./auth";

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/** ¿Puede gestionar (admin de sucursal o superior)? Incluye a dios. */
export function canManageRole(role?: string): boolean {
  return role === "admin" || role === "superadmin" || role === "dios";
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (!canManageRole(session.role)) throw new Error("FORBIDDEN");
  return session;
}

/** Solo la cuenta raíz DIOS. */
export async function requireDios(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "dios") throw new Error("FORBIDDEN");
  return session;
}

/** DIOS o super administrador (dueño de empresa): pueden gestionar sucursales. */
export async function requireCompanyManager(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "dios" && session.role !== "superadmin")
    throw new Error("FORBIDDEN");
  return session;
}

export function isAdmin(session: Session | null): boolean {
  return canManageRole(session?.role);
}

/** Rol "superadmin": dueño de una empresa. */
export function isSuperAdmin(session: Session | null): boolean {
  return session?.role === "superadmin";
}

/** Rol "dios": cuenta raíz del SaaS. */
export function isDios(session: Session | null): boolean {
  return session?.role === "dios";
}

/** Ve más de una sucursal (dios ve todas; superadministrador ve las de su empresa). */
export function isMultiBranch(session: Session | null): boolean {
  return isSuperAdmin(session) || isDios(session);
}

/**
 * Fragment `where` para acotar consultas por sucursal/empresa según el rol.
 * - dios: sin filtro (ve todo).
 * - superadmin: todas las sucursales de su empresa.
 * - admin/worker: solo su sucursal.
 * Una sesión sin sucursal (legacy/corrupta) no ve nada, nunca todo.
 */
export function branchWhere(session: Session): Record<string, unknown> {
  if (isDios(session)) return {};
  if (isSuperAdmin(session))
    return { branch: { companyId: session.companyId ?? "__NONE__" } };
  return { branchId: session.branchId ?? "__NONE__" };
}

/**
 * Sucursal destino para escrituras. Según el rol:
 * - dios/superadmin: la sucursal que indiquen (o null si no la dan).
 * - admin/worker: su propia sucursal, siempre.
 */
export function writeBranchId(session: Session, requested?: string | null): string | null {
  if (isMultiBranch(session)) return requested || null;
  return session.branchId ?? null;
}

/**
 * Fragment `where` para acotar consultas del modelo Branch (que tiene companyId).
 * - dios: sin filtro (ve todas).
 * - cualquier otro: solo sucursales de su empresa.
 */
export function companyWhere(session: Session): Record<string, unknown> {
  if (isDios(session)) return {};
  return { companyId: session.companyId ?? "__NONE__" };
}

/** companyId destino para escrituras de tenant. */
export function writeCompanyId(session: Session): string | null {
  return session.companyId ?? null;
}