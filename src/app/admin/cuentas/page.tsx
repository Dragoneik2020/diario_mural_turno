import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDios } from "@/lib/session";
import NavBar from "@/components/NavBar";
import AdminTopTabs from "@/components/AdminTopTabs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isDios(session)) redirect("/admin");

  const users = await prisma.user.findMany({
    include: {
      branch: {
        include: {
          company: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <NavBar name={session.name} role={session.role} branchName={session.branchName} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Configuración de Cuentas</h1>
          <p className="mt-2 text-slate-600">Gestiona todas las cuentas del sistema y sus roles</p>
        </div>

        <AdminTopTabs current="/admin/cuentas" superadmin={false} isDios={true} />

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Todas las cuentas ({users.length})
              </h2>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                + Nueva cuenta
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "dios" ? "bg-purple-100 text-purple-800" :
                        user.role === "superadmin" ? "bg-blue-100 text-blue-800" :
                        user.role === "admin" ? "bg-green-100 text-green-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {user.role === "dios" ? "DIOS" :
                         user.role === "superadmin" ? "Super Admin" :
                         user.role === "admin" ? "Admin" :
                         "Trabajador"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.branch?.company?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.branch?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                        Editar
                      </button>
                      {user.role !== "dios" && (
                        <button className="text-red-600 hover:text-red-900">
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
