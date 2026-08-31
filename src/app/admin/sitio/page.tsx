import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import SiteConfigEditor from "@/components/SiteConfigEditor";

export const dynamic = "force-dynamic";

export default async function SitioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Página de inicio</h1>
          <p className="text-slate-500">
            Configura el contenido de la página pública de turnos.rincon-z.cl.
          </p>
        </div>

        <AdminTopTabs current="/admin/sitio" superadmin isDios />

        <SiteConfigEditor />
      </main>
    </div>
  );
}