import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import ShiftTypeLabelsEditor from "@/components/ShiftTypeLabelsEditor";
import CargosEditor from "@/components/CargosEditor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>
          <p className="text-slate-500">Configuración general de la aplicación.</p>
        </div>

        <AdminTopTabs current="/admin/ajustes" />

        <ShiftTypeLabelsEditor />

        <CargosEditor />
      </main>
    </div>
  );
}
