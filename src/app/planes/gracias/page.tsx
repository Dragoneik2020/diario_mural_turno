"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos";

interface OrderInfo {
  id: string;
  amount: number;
  status: string;
  period: string;
  planName: string;
  companyName: string;
  companyStatus: string;
  demo: boolean;
  paidAt: string | null;
  createdAt: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function GraciasPage() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!orderId) return setMissing(true);
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) return setMissing(true);
    const data = await res.json();
    setOrder(data);
  }

  useEffect(() => {
    load();
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "pendiente") return;
    setPolling(true);
    const t = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        if (data.status !== "pendiente") {
          setPolling(false);
          clearInterval(t);
        }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [order, orderId]);

  async function simulatePay() {
    if (!orderId) return;
    setActivating(true);
    setMessage("");
    const res = await fetch(`/api/orders/${orderId}/demo-pay`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "No se pudo simular el pago.");
      setActivating(false);
      return;
    }
    await load();
    setMessage("Pago aprobado. Tu empresa ya está activa.");
    setActivating(false);
  }

  const isDemo = order?.demo === true;
  const isPending = order?.status === "pendiente";
  const isPaid = order?.status === "pagado";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] p-6 text-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_25%,rgba(99,102,241,0.16)_0%,transparent_65%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.04] p-9 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl rise">
        {missing ? (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <CalendarCheck className="h-8 w-8 text-slate-300" />
            </span>
            <h1 className="mt-5 font-display text-xl font-bold text-white">
              Orden no encontrada
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              No pudimos encontrar tu compra. Vuelve a contratar o revisa el
              enlace.
            </p>
            <Link href="/planes" className="btn-primary mt-7 w-full">
              Ver planes
            </Link>
          </>
        ) : !order ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
        ) : (
          <>
            <span
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${
                isPaid
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.06] text-slate-300"
              }`}
            >
              {isPaid ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              )}
            </span>

            <h1 className="mt-5 font-display text-xl font-bold text-white">
              {isPaid ? "¡Pago aprobado!" : "Confirmando tu compra"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {isPaid
                ? `La empresa ${order.companyName} está activa en el plan ${order.planName}. Revisa tu bandeja de correo para ver tu cuenta de acceso.`
                : `Estamos confirmando el pago de ${fmt(order.amount)} del plan ${order.planName}. Esto puede tardar unos segundos.`}
            </p>

            {isPending && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Esperando confirmación del pago…
              </div>
            )}

            {isPending && isDemo && (
              <button
                onClick={simulatePay}
                disabled={activating}
                className="btn-ghost mt-5 w-full"
              >
                {activating ? "Aprobando..." : "Simular pago aprobado (demo)"}
              </button>
            )}

            {message && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                {message}
              </div>
            )}

            {isPaid && (
              <div className="mt-7 space-y-2.5">
                {polling && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <RefreshCw className="h-3 w-3" /> Sincronizando…
                  </div>
                )}
                <Link href="/login" className="btn-primary w-full">
                  Ir al panel de {APP_NAME}
                </Link>
                <Link href="/planes" className="btn-ghost w-full">
                  Ver otros planes
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
