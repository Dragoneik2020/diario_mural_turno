import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import ShiftReports from "@/components/ShiftReports";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes de turnos</h1>
          <p className="text-slate-500">
            Cuenta DIOS: exporta turnos por empresa, trabajador y rango de fechas.
          </p>
        </div>

        <ShiftReports isDios />
      </main>
    </div>
  );
}
