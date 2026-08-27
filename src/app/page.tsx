import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRole } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (canManageRole(session.role)) redirect("/admin");
  redirect("/dashboard");
}