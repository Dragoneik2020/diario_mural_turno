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
  active: boolean;
  _count: { shifts: number };
}

export default function WorkersManager({ users }: { users: WorkerRow[] }) {
  const router = useRouter();
  const [list, setList] = useState<WorkerRow[]>(users);
  const [editing, setEditing] = useState<WorkerRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cargos, setCargos] = useState<string[]>([]);

  const blank = {
    name: "",
    email: "",
    password: "",
    role: "worker",
    department: "",
    cargo: "",
    active: true,
  };
  const [form, setForm] = useState({ ...blank });

  useEffect(() => {
    fetch("/api/settings/cargos")
      .then((r) => r.json())
      .then((d) => setCargos(Array.isArray(d.cargos) ? d.cargos : []))
      .catch(() => setCargos([]));
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
        }
      : { ...form, department: form.department || null, cargo: form.cargo || null };

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

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Users className="h-5 w-5 text-brand-600" /> Trabajadores</h2>
        <button className="btn-primary px-3 py-1.5 text-sm" onClick={openCreate}>
          + Nuevo
        </button>
        <BulkImport onDone={() => router.refresh()} />
      </div>

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
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
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
              </select>
            </div>
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
              <th className="py-2 pr-2">Depto.</th>
              <th className="py-2 pr-2">Cargo</th>
              <th className="py-2 pr-2">Rol</th>
              <th className="py-2 pr-2">Turnos</th>
              <th className="py-2 pr-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} size="sm" />
                    <span>{u.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-2 text-slate-500">{u.email}</td>
                 <td className="py-2 pr-2 text-slate-500">{u.department || "—"}</td>
                 <td className="py-2 pr-2 text-slate-500">{u.cargo || "—"}</td>
                 <td className="py-2 pr-2">
                  <span className={`badge ${u.role === "admin" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                    {u.role === "admin" ? "Admin" : "Trabajador"}
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
                  <button onClick={() => remove(u)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <EmptyState icon={Users} title="No hay trabajadores" hint="Añade el primero con el botón Nuevo." />
      )}
    </section>
  );
}
