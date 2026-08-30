import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRole, branchWhere, isDios, isMultiBranch } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminShiftsTabs from "@/components/AdminShiftsTabs";
import AdminTopTabs from "@/components/AdminTopTabs";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRole(session.role)) redirect("/dashboard");

  const scope = branchWhere(session);

  const [users, shifts] = await Promise.all([
    prisma.user.findMany({
      where: { ...scope },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, department: true },
    }),
    prisma.shift.findMany({
      where: { ...scope },
      orderBy: { start: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, department: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <NavBar
        name={session.name}
        role={session.role}
        branchName={session.branchName}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4 rise">
        <div>
          <a href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Volver al panel
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Gestión de turnos</h1>
          <p className="text-slate-500">
            Administra los turnos y consulta los días de llamados por trabajador.
          </p>
        </div>

        <AdminTopTabs current="/admin/turnos" superadmin={isMultiBranch(session)} isDios={isDios(session)} />

        <AdminShiftsTabs shifts={shifts} users={users} />
      </main>
    </div>
  );
}