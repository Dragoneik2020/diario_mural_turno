"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Lock, Sparkles } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMensual: number;
  priceAnual: number;
  maxBranches: number;
  maxWorkers: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function ContratarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preselected = params.get("plan") || "";
  const preselectedPeriod = params.get("period") === "anual" ? "anual" : "mensual";
  const canceled = params.get("canceled") === "1";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCode, setPlanCode] = useState(preselected);
  const [period, setPeriod] = useState<"mensual" | "anual">(preselectedPeriod);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRut, setAdminRut] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    if (preselected) setPlanCode(preselected);
  }, [preselected]);

  const plan = plans.find((p) => p.code === planCode);
  const price = period === "anual" ? plan?.priceAnual : plan?.priceMensual;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planCode) return setError("Selecciona un plan.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode,
          period,
          companyName,
            adminName,
            adminEmail,
            adminRut,
            adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al contratar");
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      router.push(`/planes/gracias?orderId=${data.orderId}`);
    } catch (err: any) {
      setError(err.message || "Error al contratar");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050510] text-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_-10%,rgba(99,102,241,0.14)_0%,transparent_65%)]" />
      </div>

      <Link
        href="/planes"
        className="fixed left-5 top-5 z-20 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-white/10"
      >
        ← Volver a planes
      </Link>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl items-center gap-8 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* Form */}
        <div className="rise rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-10">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                Contratar {APP_NAME}
              </h1>
              <p className="text-xs text-slate-400">Crea la cuenta administrativa de tu empresa</p>
            </div>
          </div>

          {canceled && (
            <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3.5 py-2.5 text-xs text-[#fcd34d]">
              El pago fue cancelado. Puedes reintentarlo aquí.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Plan</label>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanCode(p.code)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                      planCode === p.code
                        ? "border-brand-500/50 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          planCode === p.code ? "border-brand-400" : "border-slate-500"
                        }`}
                      >
                        {planCode === p.code && (
                          <span className="h-2 w-2 rounded-full bg-brand-400" />
                        )}
                      </span>
                      <span className="font-medium text-slate-100">{p.name}</span>
                    </span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {fmt(p.priceMensual)}
                      <span className="text-slate-500">/mes</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Periodo de facturación</label>
              <div className="grid grid-cols-2 gap-2">
                {(["mensual", "anual"] as const).map((per) => {
                  const perPlan = plans.find((p) => p.code === planCode) || plan;
                  return (
                    <button
                      key={per}
                      type="button"
                      onClick={() => setPeriod(per)}
                      className={`rounded-xl border px-3 py-2.5 text-center transition ${
                        period === per
                          ? "border-brand-500/50 bg-brand-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="text-sm font-medium capitalize text-slate-100">{per}</div>
                      <div className="text-xs tabular-nums text-slate-400">
                        {perPlan ? fmt(per === "anual" ? perPlan.priceAnual : perPlan.priceMensual) : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label">Nombre de la empresa</label>
              <input
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Clínica del Norte SpA"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre del administrador</label>
                <input
                  className="input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="label">RUT (usuario de acceso)</label>
                <input
                  className="input"
                  value={adminRut}
                  onChange={(e) => setAdminRut(e.target.value)}
                  placeholder="12.345.678-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {plan ? plan.name : "…"} · {period}
                </span>
                <span className="font-display text-lg font-bold tabular-nums text-white">
                  {price ? fmt(price) : "—"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="h-3 w-3" /> Pago seguro procesado por Khipu
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || plans.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-px hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {loading ? "Contratando..." : `Pagar ${price ? fmt(price) : ""}`}
            </button>
          </form>
        </div>

        {/* Side info */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-sm font-semibold text-white">
              ¿Qué incluye tu contrato?
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li>· Sucursal principal creada automáticamente</li>
              <li>· Panel de administración con calendarios por cargo</li>
              <li>· Mural de avisos, encuestas y exportación a Excel</li>
              <li>· Avisos por correo cuando cambias un turno</li>
              <li>· Ampliar a más sucursales y trabajadores cuando quieras</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-6 text-sm">
            <h2 className="font-display text-sm font-semibold text-[#fcd34d]">
              Modo demostración
            </h2>
            <p className="mt-2 leading-relaxed text-slate-400">
              Hoy el cobro opera por{" "}
              <span className="text-slate-200">flujo simulado</span> (sin
              credenciales Khipu configuradas). Al contratar verás la pantalla de
              confirmación con un botón para simular el pago. Cuando se
              configuren las llaves de Khipu, el cobro se hará en línea.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
