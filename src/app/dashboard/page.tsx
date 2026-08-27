import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRole } from "@/lib/session";
import NavBar from "@/components/NavBar";
import WorkerDashboardTabs from "@/components/WorkerDashboardTabs";
import MuralPanel from "@/components/MuralPanel";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (canManageRole(session.role)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6 rise">
        <div className="flex items-center gap-3">
          <Avatar name={session.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hola, {session.name}
            </h1>
            <p className="text-slate-500">
              Tus turnos personales y el calendario de todo el equipo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WorkerDashboardTabs currentUserId={session.id} />
          </div>

          <div className="space-y-6">
            <MuralPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
