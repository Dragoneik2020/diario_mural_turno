import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import WorkersManager from "@/components/WorkersManager";
import AdminTopTabs from "@/components/AdminTopTabs";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrabajadoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      cargo: true,
      active: true,
      _count: { select: { shifts: true } },
    },
  });

  return (
    <div className="min-h-screen">
      <NavBar name={session.name} role={session.role} />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4 rise">
        <div>
          <a href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Volver al panel
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Trabajadores</h1>
          <p className="text-slate-500">
            Gestiona nombre, email, departamento y rol de cada trabajador.
          </p>
        </div>

        <AdminTopTabs current="/admin/trabajadores" />

        <WorkersManager users={users} />
      </main>
    </div>
  );
}
