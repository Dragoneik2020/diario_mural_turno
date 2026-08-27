import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ProfileForm from "@/components/ProfileForm";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <main className="mx-auto max-w-xl px-4 py-6 rise">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Mi perfil</h1>
        <p className="text-slate-500 mb-6">Configura tus datos personales.</p>

        <section className="card">
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={session.name} size="lg" />
            <div>
              <div className="font-semibold text-slate-900">{session.name}</div>
              <div className="text-sm text-slate-500">{session.email}</div>
            </div>
          </div>
          <ProfileForm
            initial={{
              id: session.id,
              name: session.name,
              email: session.email,
              department: session.department ?? null,
              role: session.role,
            }}
          />
        </section>
      </main>
    </div>
  );
}
