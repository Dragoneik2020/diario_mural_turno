import { getSession, type Session } from "./auth";

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "admin") throw new Error("FORBIDDEN");
  return session;
}

export function isAdmin(session: Session | null): boolean {
  return session?.role === "admin";
}
