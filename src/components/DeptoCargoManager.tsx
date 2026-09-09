"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Briefcase, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface Item {
  name: string;
  users: number;
}

interface BranchLite {
  id: string;
  name: string;
}

function CategoryCard({
  title,
  icon: Icon,
  api,
  field,
  placeholder,
  hint,
  branchId,
  disabled = false,
}: {
  title: string;
  icon: typeof Building2;
  api: string;
  field: string;
  placeholder: string;
  hint: string;
  branchId: string;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = branchId ? `${api}?branchId=${encodeURIComponent(branchId)}` : api;
      const res = await fetch(url);
      const d = await res.json().catch(() => ({}));
      const arr = Array.isArray(d[field]) ? d[field] : [];
      const counts =
        d && typeof d.counts === "object" && d.counts ? d.counts : {};
      setItems(arr.map((n: string) => ({ name: n, users: counts?.[n] ?? 0 })));
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [api, field, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  function add() {
    const v = newItem.trim();
    if (!v) return;
    setItems((prev) =>
      prev.some((x) => x.name === v) ? prev : [...prev, { name: v, users: 0 }]
    );
    setNewItem("");
    setError("");
    setMsg("");
  }

  function removeAt(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setMsg("");
  }

  async function save() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch(api, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: items.map((x) => x.name),
          ...(branchId ? { branchId } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "error");
      }
      setMsg("Lista guardada");
      load();
    } catch {
      setError("No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-600" /> {title}
      </h2>
      <p className="text-sm text-slate-400 mb-4">{hint}</p>

      <div className="flex gap-2 mb-4">
        <input
          className="input"
          placeholder={placeholder}
          value={newItem}
          disabled={disabled}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={add} disabled={disabled}>
          Añadir
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {msg && <div className="text-sm text-emerald-600 mb-3">{msg}</div>}

      {!loaded ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={`Sin ${field}`}
          hint={`Crea el primero para empezar.`}
        />
      ) : (
        <ul className="space-y-2 mb-4">
          {items.map((it, i) => (
            <li
              key={it.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
            >
              <span className="text-sm text-slate-200">{it.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3 w-3" /> {it.users}
                </span>
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300 text-sm"
                  onClick={() => removeAt(i)}
                >
                  Eliminar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button className="btn-primary" onClick={save} disabled={busy || disabled}>
        {busy ? "Guardando…" : disabled ? "Elige una sucursal" : "Guardar cambios"}
      </button>
    </section>
  );
}

export default function DeptoCargoManager({
  branches = [],
}: {
  branches?: BranchLite[];
}) {
  const [branchId, setBranchId] = useState(() => branches[0]?.id ?? "");
  const needsBranch = branches.length > 1;

  return (
    <div className="space-y-4">
      {needsBranch && (
        <div className="card flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="label">Sucursal a administrar</label>
            <select
              className="input"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Cada sucursal tiene su propia lista de departamentos y cargos;
              no se comparten entre sucursales ni empresas.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryCard
          title="Departamentos"
          icon={Building2}
          api="/api/settings/departamentos"
          field="departamentos"
          placeholder="Nuevo departamento"
          hint="Define la lista de departamentos disponibles para asignar a los trabajadores."
          branchId={branchId}
          disabled={!branchId && needsBranch}
        />
        <CategoryCard
          title="Cargos"
          icon={Briefcase}
          api="/api/settings/cargos"
          field="cargos"
          placeholder="Nuevo cargo"
          hint="Define la lista de cargos disponibles para asignar a los trabajadores."
          branchId={branchId}
          disabled={!branchId && needsBranch}
        />
      </div>
    </div>
  );
}