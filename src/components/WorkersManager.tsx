"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BulkImport from "@/components/BulkImport";
import { Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";

export interface WorkerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  cargo: string | null;
  companyId?: string | null;
  active: boolean;
  branchId?: string | null;
  _count: { shifts: number };
}

export interface BranchOpt {
  id: string;
  name: string;
}

export interface CompanyOpt {
  id: string;
  name: string;
}

function roleLabel(r: string): string {
  if (r === "dios") return "DIOS";
  if (r === "superadmin") return "Super Admin";
  if (r === "admin") return "Admin";
  return "Trabajador";
}

function isChooseable(r: string): boolean {
  return r === "admin" || r === "superadmin" || r === "dios";
}

export default function WorkersManager({
  users,
  branches = [],
  companies = [],
  superadmin = false,
  isDios = false,
  defaultBranchId = "",
  defaultCompanyId = "",
}: {
  users: WorkerRow[];
  branches?: BranchOpt[];
  companies?: CompanyOpt[];
  superadmin?: boolean;
  isDios?: boolean;
  defaultBranchId?: string;
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [list, setList] = useState<WorkerRow[]>(users);
  const [editing, setEditing] = useState<WorkerRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cargos, setCargos] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [filterBranch, setFilterBranch] = useState(defaultBranchId);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [busyAssign, setBusyAssign] = useState<string | null>(null);

  const visible = list.filter((u) => {
    if (filterCompany && u.companyId !== filterCompany) return false;
    if (filterBranch === "__none__" ? !!u.branchId : filterBranch && u.branchId !== filterBranch)
      return false;
    if (filterDepartment && u.department !== filterDepartment) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const blank = {
    name: "",
    email: "",
    password: "",
    role: "worker",
    department: "",
    cargo: "",
    active: true,
    companyId: defaultCompanyId,
    branchId: defaultBranchId || branches[0]?.id || "",
  };
  const [form, setForm] = useState({ ...blank });

  const formBranches = form.companyId
    ? branches.filter((b) => {
        const sel = companies.find((c) => c.id === form.companyId);
        if (!sel) return true;
        const [prefix] = b.name.split("·");
        return prefix.trim() === sel.name;
      })
    : branches;

  useEffect(() => {
    fetch("/api/settings/cargos")
      .then((r) => r.json())
      .then((d) => setCargos(Array.isArray(d.cargos) ? d.cargos : []))
      .catch(() => setCargos([]));
    fetch("/api/settings/departamentos")
      .then((r) => r.json())
      .then((d) => setDepartamentos(Array.isArray(d.departamentos) ? d.departamentos : []))
      .catch(() => setDepartamentos([]));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...blank });
    setShowForm(true);
    setError("");
  }

  function openEdit(u: WorkerRow) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      department: u.department || "",
      cargo: u.cargo || "",
      active: u.active,
      companyId: u.companyId || "",
      branchId: u.branchId ?? defaultBranchId ?? branches[0]?.id ?? "",
    });
    setShowForm(true);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PATCH" : "POST";
    const body = editing
      ? {
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department || null,
          cargo: form.cargo || null,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
          ...(superadmin && form.branchId ? { branchId: form.branchId } : {}),
          ...(isDios && (form.companyId || defaultCompanyId)
            ? { companyId: defaultCompanyId || form.companyId }
            : {}),
        }
      : {
          ...form,
          department: form.department || null,
          cargo: form.cargo || null,
          ...(superadmin && form.branchId ? { branchId: form.branchId } : {}),
          ...(isDios && (form.companyId || defaultCompanyId)
            ? { companyId: defaultCompanyId || form.companyId }
            : {}),
        };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al guardar");
      return;
    }
    setShowForm(false);
    router.refresh();
  }

  async function remove(u: WorkerRow) {
    if (!confirm(`¿Eliminar a ${u.name}? Se borrarán sus turnos.`)) return;
    await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleActive(u: WorkerRow) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    router.refresh();
  }

  async function assignBranch(u: WorkerRow, branchId: string) {
    if (busyAssign) return;
    setBusyAssign(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branchId || null }),
      });
      const ok = res.ok ? (await res.json().catch(() => null)) : null;
      setList((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, branchId: branchId || null } : x
        )
      );
      if (!ok) setError("No se pudo asignar la sucursal");
    } catch {
      setError("Error al asignar la sucursal");
    } finally {
      setBusyAssign(null);
      router.refresh();
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Users className="h-5 w-5 text-brand-600" /> Cuentas</h2>
        <button className="btn-primary px-3 py-1.5 text-sm" onClick={openCreate}>
          + Nuevo
        </button>
        <BulkImport
          onDone={() => router.refresh()}
          branches={branches}
          superadmin={superadmin}
          defaultBranchId={filterBranch || defaultBranchId}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="sr-only" htmlFor="user-search">Buscar</label>
          <input
            id="user-search"
            className="input text-xs"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isDios && companies.length > 0 && (
          <div>
            <label className="sr-only" htmlFor="company-filter">Filtrar por empresa</label>
            <select
              id="company-filter"
              className="input !w-auto text-xs"
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                setFilterBranch("");
              }}
            >
              <option value="">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {superadmin && branches.length > 0 && (
          <div>
            <label className="sr-only" htmlFor="branch-filter">Filtrar por sucursal</label>
            <select
              id="branch-filter"
              className="input !w-auto text-xs"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              <option value="__none__">Sin sucursal</option>
              {branches.filter((b) => {
                if (!filterCompany) return true;
                const sel = companies.find((c) => c.id === filterCompany);
                if (!sel) return true;
                const [prefix] = b.name.split("·");
                return prefix.trim() === sel.name;
              }).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="sr-only" htmlFor="dept-filter">Filtrar por departamento</label>
          <select
            id="dept-filter"
            className="input !w-auto text-xs"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="role-filter">Filtrar por rol</label>
          <select
            id="role-filter"
            className="input !w-auto text-xs"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {isDios && <option value="dios">DIOS</option>}
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="worker">Trabajador</option>
          </select>
        </div>
        {(search || filterCompany || filterBranch || filterDepartment || filterRole) && (
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              setSearch("");
              setFilterCompany("");
              setFilterBranch("");
              setFilterDepartment("");
              setFilterRole("");
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Contraseña {editing && "(dejar vacío para no cambiar)"}</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={6} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">—</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cargo</label>
              <select className="input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
                <option value="">—</option>
                {cargos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="worker">Trabajador</option>
                <option value="admin">Admin</option>
                {isDios && <option value="superadmin">Super Admin (dueño de empresa)</option>}
              </select>
            </div>
            {isDios && companies.length > 0 && (
              <div>
                <label className="label">Empresa</label>
                <select className="input" value={form.companyId} onChange={(e) => {
                  setForm({ ...form, companyId: e.target.value, branchId: "" });
                }}>
                  <option value="">— sin empresa</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {superadmin && (
              <div>
                <label className="label">Sucursal</label>
                <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  {formBranches.length === 0 && <option value="">Sin sucursales</option>}
                  {formBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-6">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activo
            </label>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Nombre</th>
              <th className="py-2 pr-2">Email</th>
              <th className="py-2 pr-2">Sucursal</th>
              <th className="py-2 pr-2">Cargo</th>
              <th className="py-2 pr-2">Rol</th>
              <th className="py-2 pr-2">Turnos</th>
              <th className="py-2 pr-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} size="sm" />
                    <span>{u.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-2 text-slate-500">{u.email}</td>
                <td className="py-2 pr-2">
                  {superadmin ? (
                    <select
                      aria-label={`Sucursal de ${u.name}`}
                      className="input !w-auto !px-2 !py-1 text-xs"
                      value={u.branchId ?? ""}
                      disabled={busyAssign === u.id}
                      onChange={(e) => {
                        setError("");
                        assignBranch(u, e.target.value);
                      }}
                    >
                      <option value="">— sin sucursal</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-500">
                      {branches.find((b) => b.id === u.branchId)?.name ?? "—"}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-2 text-slate-500">{u.cargo || "—"}</td>
                <td className="py-2 pr-2">
                  <span className={`badge ${isChooseable(u.role) ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="py-2 pr-2 text-slate-500">{u._count.shifts}</td>
                <td className="py-2 pr-2">
                  <button onClick={() => toggleActive(u)} className={`badge ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {u.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="py-2 pr-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(u)} className="text-xs text-brand-600 hover:underline mr-2">
                    Editar
                  </button>
                  {u.role !== "dios" && (
                    <button onClick={() => remove(u)} className="text-xs text-red-500 hover:underline">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <EmptyState icon={Users} title="No hay trabajadores" hint="Añade el primero con el botón Nuevo." />
      )}
      {list.length > 0 && visible.length === 0 && (
        <EmptyState
          icon={Users}
          title="Sin resultados"
          hint="Ajusta los filtros de búsqueda o crea una cuenta nueva."
          action={
            <button className="btn-ghost text-xs" onClick={() => { setSearch(""); setFilterRole(""); setFilterBranch(""); }}>
              Limpiar filtros
            </button>
          }
        />
      )}
    </section>
  );
}