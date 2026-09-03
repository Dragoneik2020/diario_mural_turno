import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { diosCompanyScope, isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import WorkersManager from "@/components/WorkersManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  const scopeCompanyId = diosCompanyScope();

  const [users, branchesRaw, companies] = await Promise.all([
    prisma.user.findMany({
      where: scopeCompanyId ? { companyId: scopeCompanyId } : {},
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        cargo: true,
        companyId: true,
        active: true,
        branchId: true,
        _count: { select: { shifts: true } },
      },
    }),
    prisma.branch.findMany({
      where: scopeCompanyId ? { companyId: scopeCompanyId } : {},
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, company: { select: { name: true } } },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const branches = branchesRaw.map((b) => ({
    id: b.id,
    name: b.company?.name ? `${b.company.name} · ${b.name}` : b.name,
  }));

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas y roles</h1>
          <p className="text-slate-500">
            Crea, edita o elimina cuentas del sistema, asigna rol, jerarquía y sucursal.
          </p>
        </div>

        <AdminTopTabs current="/admin/cuentas" superadmin isDios />

        <WorkersManager users={users} branches={branches} companies={scopeCompanyId ? [] : companies} defaultCompanyId={scopeCompanyId ?? ""} superadmin isDios />
      </main>
    </div>
  );
}
