"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface BranchRow {
  id: string;
  name: string;
  createdAt: string;
  _count: { users: number; shifts: number };
}

export default function BranchManager() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

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
        body: JSON.stringify({ name: v }),
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

      <form onSubmit={create} className="flex gap-2 mb-5">
        <input
          className="input"
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
              <div>
                <div className="font-medium text-slate-800">{b.name}</div>
                <div className="text-xs text-slate-400">
                  {b._count.users} personas · {b._count.shifts} turnos
                </div>
              </div>
              <a
                href={`/admin/trabajadores?sucursal=${b.id}`}
                className="btn-ghost px-3 py-1.5 text-xs shrink-0"
              >
                Gestionar gente
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}