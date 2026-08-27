import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalMetrics } from "@/lib/metrics";
import NavBar from "@/components/NavBar";
import LlamadosPorTrabajador from "@/components/LlamadosPorTrabajador";
import ShiftReports from "@/components/ShiftReports";
import AdminStats from "@/components/AdminStats";
import AdminTopTabs from "@/components/AdminTopTabs";
import TeamCalendar from "@/components/TeamCalendar";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const from30 = new Date(start);
  from30.setDate(from30.getDate() - 29);
  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [users, metrics, boardShifts, monthShifts, pendingShifts, todayShifts] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          active: true,
          _count: { select: { shifts: true } },
        },
      }),
      getGlobalMetrics(30),
      prisma.shift.findMany({
        where: { date: { gte: start, lt: end } },
        include: { user: { select: { id: true, name: true, department: true } } },
        orderBy: [{ date: "asc" }, { start: "asc" }],
      }),
      prisma.shift.findMany({
        where: { date: { gte: from30 } },
        include: { user: { select: { id: true, name: true, department: true } } },
        orderBy: { start: "desc" },
      }),
      prisma.shift.findMany({
        where: { status: "asignado" },
        include: { user: { select: { id: true, name: true, department: true } } },
        orderBy: { start: "asc" },
      }),
      prisma.shift.findMany({
        where: { date: { gte: start, lt: tomorrow } },
        include: { user: { select: { id: true, name: true, department: true } } },
        orderBy: { start: "asc" },
      }),
    ]);

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
          <p className="text-slate-500">Gestiona trabajadores, turnos y métricas.</p>
        </div>

        <AdminTopTabs current="/admin" />

        <AdminStats
          metrics={metrics}
          workers={users}
          monthShifts={monthShifts}
          pendingShifts={pendingShifts}
          todayShifts={todayShifts}
        />

        <TeamCalendar currentUserId={session.id} />

        <section className="card">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-brand-600" /> Turnos próximos</h2>
            <ul className="divide-y divide-slate-100 max-h-[28rem] overflow-auto">
              {boardShifts.length === 0 && (
                <li className="text-sm text-slate-400">Sin turnos programados.</li>
              )}
              {boardShifts.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <span className="font-medium text-slate-800">{s.user.name}</span>
                  <span className="text-slate-500">
                    {" "}
                    · {new Date(s.start).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}{" "}
                    {new Date(s.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}–
                    {new Date(s.end).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

        <ShiftReports />
      </main>
    </div>
  );
}
