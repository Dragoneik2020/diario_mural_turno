import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  canManageRole,
  isDios,
  isMultiBranch,
  companyWhere,
  diosCompanyScope,
} from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import DeptoCargoManager from "@/components/DeptoCargoManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRole(session.role)) redirect("/dashboard");

  const dios = isDios(session);
  const scopeCompanyId = dios ? diosCompanyScope() : null;
  const branchesRaw = await prisma.branch.findMany({
    where:
      dios && scopeCompanyId
        ? { companyId: scopeCompanyId }
        : { ...companyWhere(session) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, company: { select: { name: true } } },
  });
  const branches = branchesRaw.map((b) => ({
    id: b.id,
    name: b.company?.name ? `${b.company.name} · ${b.name}` : b.name,
  }));

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

        <AdminTopTabs current="/admin/categorias" superadmin={isMultiBranch(session)} isDios={isDios(session)} />

        <DeptoCargoManager branches={branches} />
      </main>
    </div>
  );
}