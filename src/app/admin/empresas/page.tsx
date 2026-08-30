import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import CompaniesManager from "@/components/CompaniesManager";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500">
            Cuenta DIOS: gestiona tenants, planes, sucursales, órdenes y estado de suscripción.
          </p>
        </div>

        <AdminTopTabs current="/admin/empresas" superadmin isDios />

        <CompaniesManager />
      </main>
    </div>
  );
}