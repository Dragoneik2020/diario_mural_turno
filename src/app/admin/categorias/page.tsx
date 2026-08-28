import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRole, isSuperAdmin } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import DeptoCargoManager from "@/components/DeptoCargoManager";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
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
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Departamentos y cargos
          </h1>
          <p className="text-slate-500">
            Administra las listas de departamentos y cargos que se usan al
            registrar trabajadores.
          </p>
        </div>

        <AdminTopTabs current="/admin/categorias" superadmin={isSuperAdmin(session)} />

        <DeptoCargoManager />
      </main>
    </div>
  );
}