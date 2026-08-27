import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import BranchManager from "@/components/BranchManager";
import AdminTopTabs from "@/components/AdminTopTabs";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SucursalesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 rise">
        <div>
          <a href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Volver al panel
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Sucursales</h1>
          <p className="text-slate-500">
            Crea y gestiona las sucursales. Cada una tiene su propia gente, turnos y muro.
          </p>
        </div>

        <AdminTopTabs current="/admin/sucursales" superadmin />

        <BranchManager />
      </main>
    </div>
  );
}