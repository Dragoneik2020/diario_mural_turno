import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import Avatar from "@/components/Avatar";
import { prisma } from "@/lib/prisma";
import { UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  dios: "DIOS",
  superadmin: "Super Admin",
  admin: "Admin",
  worker: "Trabajador",
};

const ROLE_BADGE: Record<string, string> = {
  dios: "!border-rose-400/30 !bg-rose-500/15 !text-rose-300",
  superadmin: "!border-amber-400/30 !bg-amber-500/15 !text-amber-300",
  admin: "!border-brand-400/30 !bg-brand-500/15 !text-brand-300",
  worker: "!border-white/10 !bg-white/[0.06] !text-slate-300",
};

export default async function CuentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  const users = await prisma.user.findMany({
    include: {
      branch: {
        include: { company: { select: { name: true } } },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas y roles</h1>
          <p className="text-slate-500">
            Cuenta DIOS: todas las cuentas del sistema con su rol, empresa y sucursal.
          </p>
        </div>

        <AdminTopTabs current="/admin/cuentas" superadmin isDios />

        <section className="card !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-brand-600" />
              Todas las cuentas ({users.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Usuario</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-5 py-3 font-semibold">Sucursal</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{u.name}</div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${ROLE_BADGE[u.role] ?? ROLE_BADGE.worker}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {u.branch?.company?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {u.branch?.name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
                          u.active
                            ? "!border-emerald-400/30 !bg-emerald-500/15 !text-emerald-300"
                            : "!border-red-400/30 !bg-red-500/15 !text-red-300"
                        }`}
                      >
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No hay cuentas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
