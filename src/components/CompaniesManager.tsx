"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, ChevronDown, Clock, DoorOpen, Pencil, Plus, XCircle } from "lucide-react";

interface PlanLite { id: string; code: string; name: string; priceMensual: number; }
interface OrderLite { id: string; status: string; amount: number; period: string; paidAt: string | null; createdAt: string; plan: { name: string }; }
interface BranchLite { id: string; name: string; }
interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: PlanLite | null;
  branches: BranchLite[];
  orders: OrderLite[];
  workerCount: number;
  createdAt: string;
  currentPeriodEnd: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  activa: { label: "Activa", cls: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300", icon: CheckCircle2 },
  pendiente: { label: "Pendiente", cls: "border-amber-400/30 bg-amber-500/10 text-amber-300", icon: Clock },
  cancelada: { label: "Cancelada", cls: "border-red-400/30 bg-red-500/10 text-red-300", icon: XCircle },
};

export default function CompaniesManager() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPlan, setCreatePlan] = useState("");
  const [createStatus, setCreateStatus] = useState("activa");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch("/api/companies").then((r) => r.json()),
        fetch("/api/plans").then((r) => r.json()),
      ]);
      setCompanies(c.companies);
      setPlans(p.plans);
    } catch {
      setError("No se pudieron cargar las empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patchCompany(id: string, data: { status?: string; planId?: string; name?: string }) {
    setSavingId(id);
    setError("");
    const res = await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSavingId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al guardar");
      return;
    }
    await load();
  }

  async function createCompany() {
    const name = createName.trim();
    if (name.length < 2) {
      setError("Ingresa un nombre de al menos 2 caracteres.");
      return;
    }
    setCreating(true);
    setError("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, planId: createPlan || undefined, status: createStatus }),
    });
    setCreating(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al crear la empresa");
      return;
    }
    setShowCreate(false);
    setCreateName("");
    setCreatePlan("");
    setCreateStatus("activa");
    await load();
  }

  async function toggleOrders(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setOrders([]);
      return;
    }
    setExpanded(id);
    const res = await fetch(`/api/companies/${id}/orders`);
    if (res.ok) {
      const d = await res.json();
      setOrders(d.orders);
    }
  }

  async function removeCompany(c: Company) {
    if (
      !confirm(
        `¿Eliminar la empresa "${c.name}"?\n\nSe borrarán sus ${c.branches.length} sucursales, ${c.workerCount} trabajadores y todas sus órdenes. Esta acción no se puede deshacer.`
      )
    )
      return;
    setSavingId(c.id);
    setError("");
    const res = await fetch(`/api/companies/${c.id}`, { method: "DELETE" });
    setSavingId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al eliminar la empresa");
      return;
    }
    await load();
  }

  async function enterCompany(c: Company) {
    setSavingId(c.id);
    setError("");
    const res = await fetch("/api/companies/acceder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: c.id }),
    });
    setSavingId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error al entrar a la empresa");
      return;
    }
    window.location.href = "/admin";
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando empresas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Gestiona las empresas del sistema. Al crear una, se genera su primera
          sucursal y podrás acceder en modo empresa desde la cuenta DIOS.
        </p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20 hover:text-white"
        >
          <Plus className="mr-1.5 inline h-4 w-4" />
          {showCreate ? "Cancelar" : "Crear empresa"}
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-3.5">
          <div>
            <h4 className="font-display text-sm font-semibold text-white">
              Nueva empresa
            </h4>
            <p className="text-xs text-slate-500">
              Se creará la sucursal “Sucursal Principal” automáticamente.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="label">Nombre de la empresa</label>
              <input
                className="input"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ej: Club Dreams"
                autoFocus
              />
            </div>
            <select
              className="input text-xs"
              value={createPlan}
              onChange={(e) => setCreatePlan(e.target.value)}
            >
              <option value="">Sin plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {fmt(p.priceMensual)}/mes
                </option>
              ))}
            </select>
            <select
              className="input text-xs"
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value)}
            >
              <option value="activa">Activa</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              disabled={creating}
              className="btn-ghost px-4 text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={createCompany}
              disabled={creating}
              className="rounded-full bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
            >
              {creating ? "Creando…" : "Crear empresa"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}
      {companies.length === 0 && (
        <div className="card text-sm text-slate-400">
          Aún no hay empresas registradas. Cuando alguien contrate un plan desde
          /planes aparecerá aquí.
        </div>
      )}

      {companies.map((c) => {
        const st = STATUS_LABEL[c.status] || STATUS_LABEL.pendiente;
        const StIcon = st.icon;
        const isSaving = savingId === c.id;
        return (
          <div key={c.id} className="card card-hover">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[15px] font-semibold text-white">
                      {c.name}
                    </h3>
                    <button
                      onClick={() => {
                        const nuevo = window.prompt("Nuevo nombre de la empresa", c.name)?.trim();
                        if (nuevo && nuevo !== c.name) patchCompany(c.id, { name: nuevo });
                      }}
                      disabled={isSaving}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      title="Renombrar empresa"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <span className={`badge ${st.cls}`}>
                      <StIcon className="h-3 w-3" /> {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.slug} · creada{" "}
                    {new Date(c.createdAt).toLocaleDateString("es-CL")}
                    {c.currentPeriodEnd
                      ? ` · vigente hasta ${new Date(c.currentPeriodEnd).toLocaleDateString("es-CL")}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-center">
                  <div className="font-display text-sm font-bold tabular-nums text-white">{c.workerCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Turnos/Usuarios</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-center">
                  <div className="font-display text-sm font-bold tabular-nums text-white">{c.branches.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Sucursales</div>
                </div>

                <select
                  className="input w-auto text-xs"
                  value={c.plan?.id ?? ""}
                  disabled={isSaving}
                  onChange={(e) => patchCompany(c.id, { planId: e.target.value })}
                >
                  <option value="" disabled>Sin plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {fmt(p.priceMensual)}/mes
                    </option>
                  ))}
                </select>

                <select
                  className="input w-auto text-xs"
                  value={c.status}
                  disabled={isSaving}
                  onChange={(e) => patchCompany(c.id, { status: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="activa">Activa</option>
                  <option value="cancelada">Cancelada</option>
                </select>

                <button
                  onClick={() => enterCompany(c)}
                  disabled={isSaving}
                  className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-[11px] font-semibold text-brand-200 transition hover:bg-brand-500/20 hover:text-white disabled:opacity-50"
                  title="Entrar a la empresa (modo empresa)"
                >
                  <DoorOpen className="mr-1 inline h-3.5 w-3.5" />
                  {isSaving ? "Entrando…" : "Acceder"}
                </button>

                <button
                  onClick={() => removeCompany(c)}
                  disabled={isSaving}
                  className="rounded-full border border-red-400/25 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
                  title="Eliminar empresa"
                >
                  {isSaving ? "Borrando…" : "Eliminar"}
                </button>

                <button
                  onClick={() => toggleOrders(c.id)}
                  className="btn-ghost px-3 text-xs"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition ${expanded === c.id ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>

            {expanded === c.id && (
              <div className="mt-4 border-t border-white/[0.08] pt-4">
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin órdenes registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {orders.map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm"
                      >
                        <div>
                          <span className="font-medium text-slate-200">{o.plan.name}</span>
                          <span className="text-slate-500"> · {o.period}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-slate-300">{fmt(o.amount)}</span>
                          <span
                            className={`badge ${
                              o.status === "pagado"
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {o.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {o.status === "pagado" && o.paidAt
                              ? new Date(o.paidAt).toLocaleString("es-CL")
                              : new Date(o.createdAt).toLocaleString("es-CL")}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}