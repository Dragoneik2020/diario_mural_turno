import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import WhatsAppConfigEditor from "@/components/WhatsAppConfigEditor";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 rise">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API de WhatsApp</h1>
          <p className="text-slate-500">
            Credenciales de la WhatsApp Cloud API para las notificaciones por WhatsApp.
          </p>
        </div>

        <AdminTopTabs current="/admin/whatsapp" superadmin isDios />

        <WhatsAppConfigEditor />
      </main>
    </div>
  );
}