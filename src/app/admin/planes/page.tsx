import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import PlansManager from "@/components/PlansManager";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes</h1>
          <p className="text-slate-500">
            Crea y edita los planes que se ofrecen en la página pública /planes.
          </p>
        </div>

        <AdminTopTabs current="/admin/planes" superadmin isDios />

        <PlansManager />
      </main>
    </div>
  );
}