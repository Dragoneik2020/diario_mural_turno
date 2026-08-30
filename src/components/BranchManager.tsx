"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface BranchRow {
  id: string;
  name: string;
  companyId: string | null;
  createdAt: string;
  _count: { users: number; shifts: number };
}

interface CompanyLite {
  id: string;
  name: string;
  plan: { name: string } | null;
}

export default function BranchManager({
  autoCompany,
}: {
  autoCompany?: string;
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [companyId, setCompanyId] = useState(autoCompany ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      const d = await res.json();
      setBranches(Array.isArray(d.branches) ? d.branches : []);
    } catch {
      setBranches([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    if (autoCompany) return;
    try {
      const res = await fetch("/api/companies");
      const d = await res.json();
      if (Array.isArray(d.companies)) {
        setCompanies(d.companies);
        if (d.companies.length === 1) setCompanyId(d.companies[0].id);
      }
    } catch {
      setCompanies([]);
    }
  }, [autoCompany]);

  useEffect(() => {
    load();
    loadCompanies();
  }, [load, loadCompanies]);

  useEffect(() => {
    if (companyId) setMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function startEdit(b: BranchRow) {
    setEditingId(b.id);
    setEditName(b.name);
    setError("");
    setMsg("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const v = editName.trim();
    if (!v || !editingId || busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/branches/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "No se pudo renombrar la sucursal");
        return;
      }
      setEditingId(null);
      setMsg("Sucursal renombrada");
      router.refresh();
      load();
    } catch {
      setError("Error al renombrar la sucursal");
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: BranchRow) {
    if (
      !confirm(
        `¿Eliminar la sucursal "${b.name}"?\n\nSus trabajadores, turnos, anuncios y encuestas quedarán sin sucursal.`
      )
    )
      return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/branches/${b.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "No se pudo eliminar la sucursal");
        return;
      }
      setMsg("Sucursal eliminada");
      router.refresh();
      load();
    } catch {
      setError("Error al eliminar la sucursal");
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v || busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v, companyId: companyId || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "No se pudo crear la sucursal");
        return;
      }
      setName("");
      setMsg("Sucursal creada");
      router.refresh();
      load();
    } catch {
      setError("Error al crear la sucursal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Store className="h-5 w-5 text-brand-600" /> Sucursales
      </h2>

      <form onSubmit={create} className="flex flex-wrap gap-2 mb-5">
        {companies.length > 0 && (
          <select
            className="input !w-auto text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            title="Empresa a la que pertenece la sucursal"
          >
            <option value="">Sin empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.plan ? ` · ${c.plan.name}` : ""}
              </option>
            ))}
          </select>
        )}
        <input
          className="input min-w-[180px] flex-1"
          placeholder="Nombre de la nueva sucursal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy}>
          {busy ? "Creando…" : "Crear"}
        </button>
      </form>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {msg && <div className="text-sm text-emerald-600 mb-3">{msg}</div>}

      {!loaded ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Sin sucursales"
          hint="Crea la primera sucursal para empezar."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {branches.map((b) => (
            <li key={b.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {editingId === b.id ? (
                  <form onSubmit={saveEdit} className="flex gap-2">
                    <input
                      className="input !py-1 text-sm"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn-primary px-3 py-1 text-xs shrink-0"
                      disabled={busy}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs shrink-0"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="font-medium text-slate-800">{b.name}</div>
                    <div className="text-xs text-slate-400">
                      {b._count.users} personas · {b._count.shifts} turnos
                      {b.companyId && (
                        <span className="ml-1.5 text-brand-400">
                          · {companies.find((c) => c.id === b.companyId)?.name ?? "Empresa"}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editingId !== b.id && (
                  <>
                    <button
                      onClick={() => startEdit(b)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Renombrar
                    </button>
                    <button
                      onClick={() => remove(b)}
                      disabled={busy}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
                <a
                  href={`/admin/trabajadores?sucursal=${b.id}`}
                  className="btn-ghost px-3 py-1.5 text-xs shrink-0"
                >
                  Gestionar gente
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}