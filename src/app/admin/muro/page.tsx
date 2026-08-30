import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRole, isDios, isMultiBranch } from "@/lib/session";
import NavBar from "@/components/NavBar";
import MuralManager from "@/components/MuralManager";
import AdminTopTabs from "@/components/AdminTopTabs";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MuroPage() {
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
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4 rise">
        <div>
          <a href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Volver al panel
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Gestión del muro</h1>
          <p className="text-slate-500">
            Publica anuncios y crea encuestas para el equipo.
          </p>
        </div>

        <AdminTopTabs current="/admin/muro" superadmin={isMultiBranch(session)} isDios={isDios(session)} />

        <MuralManager />
      </main>
    </div>
  );
}