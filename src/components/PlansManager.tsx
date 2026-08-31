"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMensual: number;
  priceAnual: number;
  maxBranches: number;
  maxWorkers: number;
  features: string | null;
  active: boolean;
  _count?: { companies: number };
}

const EMPTY: Omit<Plan, "id" | "_count"> = {
  code: "",
  name: "",
  description: "",
  priceMensual: 0,
  priceAnual: 0,
  maxBranches: 0,
  maxWorkers: 0,
  features: "",
  active: true,
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPlans(d.plans);
    } catch {
      setError("No se pudieron cargar los planes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setError("");
    const payload = { ...editing };
    delete (payload as any)._count;
    const res = await fetch(isNew ? "/api/admin/plans" : `/api/admin/plans/${editing.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al guardar");
      return;
    }
    setEditing(null);
    setIsNew(false);
    await load();
  }

  async function remove(p: Plan) {
    if (!confirm(`¿Eliminar el plan "${p.name}"?`)) return;
    setError("");
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al eliminar");
      return;
    }
    await load();
  }

  function field<K extends keyof Omit<Plan, "id" | "_count">>(key: K, value: Partial<Plan>[K]) {
    setEditing((e) => (e ? { ...e, [key]: value } : e));
  }

  const inputCls = "input text-sm";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-400";

  if (loading) return <p className="text-sm text-slate-400">Cargando planes…</p>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      <button
        className="btn-primary px-4 py-2.5 text-sm"
        onClick={() => {
          setEditing({ ...EMPTY, id: "" });
          setIsNew(true);
        }}
      >
        <Plus className="h-4 w-4" /> Nuevo plan
      </button>

      {editing && (
        <div className="card space-y-4 border-brand-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">
              {isNew ? "Nuevo plan" : `Editar: ${editing.name}`}
            </h3>
            <button
              className="text-slate-400 hover:text-white"
              onClick={() => {
                setEditing(null);
                setIsNew(false);
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} value={editing.name} onChange={(e) => field("name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Código (slug, único)</label>
              <input className={inputCls} value={editing.code} onChange={(e) => field("code", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Descripción</label>
              <textarea className={inputCls} rows={2} value={editing.description || ""} onChange={(e) => field("description", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Precio mensual (CLP)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={editing.priceMensual}
                onChange={(e) => field("priceMensual", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Precio anual (CLP)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={editing.priceAnual}
                onChange={(e) => field("priceAnual", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Máx. sucursales (0 = ilimitadas)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={editing.maxBranches}
                onChange={(e) => field("maxBranches", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Máx. trabajadores (0 = ilimitados)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={editing.maxWorkers}
                onChange={(e) => field("maxWorkers", Number(e.target.value) || 0)}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Características (una por línea)</label>
              <textarea className={inputCls} rows={3} value={editing.features || ""} onChange={(e) => field("features", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={editing.active}
                onChange={(e) => field("active", e.target.checked)}
              />
              Plan activo (se ofrece al contratar)
            </label>
          </div>

          <button onClick={save} className="btn-primary px-4 py-2.5 text-sm">
            <Save className="h-4 w-4" /> Guardar plan
          </button>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="card flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[15px] font-semibold text-white">{p.name}</h3>
                {!p.active && (
                  <span className="badge border-amber-400/30 bg-amber-500/10 text-amber-300">Inactivo</span>
                )}
                {p._count && p._count.companies > 0 && (
                  <span className="badge border-white/10 bg-white/[0.04] text-slate-300">
                    {p._count.companies} empresa(s)
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {p.code}
                {p.description ? ` · ${p.description}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                  {fmt(p.priceMensual)}/mes
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                  {fmt(p.priceAnual)}/año
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                  {p.maxBranches === 0 ? "∞ sucursales" : `${p.maxBranches} sucursales`}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                  {p.maxWorkers === 0 ? "∞ trabajadores" : `${p.maxWorkers} trabajadores`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => {
                  setEditing({ ...p });
                  setIsNew(false);
                }}
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button
                className="rounded-full border border-red-400/25 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                onClick={() => remove(p)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}