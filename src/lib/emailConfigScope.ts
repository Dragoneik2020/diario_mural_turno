import { prisma } from "@/lib/prisma";
import { isDios, isSuperAdmin, diosCompanyScope } from "@/lib/session";
import type { Session } from "@/lib/auth";

/**
 * Empresa asignable por el usuario para configurar el correo a nivel empresa.
 * Solo superadmin (su propia empresa) o DIOS (empresa del "modo empresa").
 */
export function authorizeCompanyScope(session: Session): string | null {
  if (isSuperAdmin(session)) return session.companyId ?? null;
  if (isDios(session)) return diosCompanyScope();
  return null;
}

/**
 * Valida que el usuario pueda configurar el correo de la sucursal `branchId`.
 * - admin: solo su propia sucursal.
 * - superadmin: cualquier sucursal de su empresa.
 * - dios: cualquier sucursal (o solo las del "modo empresa" si está abierto).
 * Devuelve el branchId si está permitido, o null.
 */
export async function authorizeBranchScope(
  session: Session,
  branchId?: string | null
): Promise<string | null> {
  if (!branchId) return null;
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  if (!branch) return null;

  if (session.role === "admin") return session.branchId === branchId ? branchId : null;
  if (session.role === "superadmin") return session.companyId === branch.companyId ? branchId : null;
  if (session.role === "dios") {
    const scope = diosCompanyScope();
    if (scope && scope !== branch.companyId) return null;
    return branchId;
  }
  return null;
}