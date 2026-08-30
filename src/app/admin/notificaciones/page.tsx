import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRole, isDios, isMultiBranch } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import EmailNotificationsEditor from "@/components/EmailNotificationsEditor";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRole(session.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <NavBar
        name={session.name}
        role={session.role}
        branchName={session.branchName}
      />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>
          <p className="text-slate-500">Configura cómo avisar a los trabajadores al asignarles turnos.</p>
        </div>

        <AdminTopTabs current="/admin/notificaciones" superadmin={isMultiBranch(session)} isDios={isDios(session)} />

        <EmailNotificationsEditor />
      </main>
    </div>
  );
}