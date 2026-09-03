import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  branchWhere,
  companyWhere,
  diosCompanyScope,
  canManageRole,
  isDios,
  isMultiBranch,
} from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import WorkersManager from "@/components/WorkersManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: { sucursal?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRole(session.role)) redirect("/dashboard");

  const dios = isDios(session);
  const superadmin = isMultiBranch(session);
  const scopeCompanyId = dios ? diosCompanyScope() : null;

  const [users, branchesRaw, companies] = await Promise.all([
    prisma.user.findMany({
      where: { ...branchWhere(session) },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        rut: true,
        role: true,
        department: true,
        cargo: true,
        companyId: true,
        telegramChatId: true,
        active: true,
        branchId: true,
        _count: { select: { shifts: true } },
      },
    }),
    prisma.branch.findMany({
      where:
        dios && scopeCompanyId
          ? { companyId: scopeCompanyId }
          : { ...companyWhere(session) },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, company: { select: { name: true } } },
    }),
    dios
      ? prisma.company.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const branches = dios
    ? branchesRaw.map((b) => ({
        id: b.id,
        name: b.company?.name ? `${b.company.name} · ${b.name}` : b.name,
      }))
    : branchesRaw.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas</h1>
          <p className="text-slate-500">
            Crea, edita o elimina cuentas y asigna rol, empresa, sucursal y departamento.
          </p>
        </div>

        <AdminTopTabs current="/admin/cuentas" superadmin={superadmin} isDios={dios} />

        <WorkersManager
          users={users}
          branches={branches}
          companies={dios && !scopeCompanyId ? companies : []}
          defaultCompanyId={dios ? (scopeCompanyId ?? "") : ""}
          defaultBranchId={superadmin ? searchParams?.sucursal ?? "" : ""}
          superadmin={superadmin}
          isDios={dios}
        />
      </main>
    </div>
  );
}
