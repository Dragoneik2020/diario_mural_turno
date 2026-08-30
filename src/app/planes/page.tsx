import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Check, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos";

export const metadata: Metadata = {
  title: "Planes y precios",
  description:
    "Elige el plan de tu empresa. Pago online con Khipu, contratación inmediata y panel para gestionar sucursales, departamentos y turnos.",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default async function PlanesPage() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { priceMensual: "asc" },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050510] text-slate-100">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050510]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">
              {APP_NAME}
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="/#funciones" className="transition hover:text-white">
              Funciones
            </a>
            <a href="/#estructura" className="transition hover:text-white">
              Estructura
            </a>
          </nav>
          <Link href="/login" className="btn-ghost">
            Ingresar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-16 text-center lg:px-8 lg:pt-24">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-400">
          <Sparkles className="h-3.5 w-3.5" /> Planes y precios
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Contrata tu mural de turnos
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400">
          Pago online seguro con <strong className="text-slate-200">Khipu</strong> y
          acceso inmediato al panel. Cancela o cambia de plan cuando quieras.
        </p>
      </section>

      {/* CARDS */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((p) => {
            const features: string[] = p.features ? JSON.parse(p.features) : [];
            const highlight = p.code === "pro";
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-3xl border p-7 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                  highlight
                    ? "border-brand-500/40 bg-brand-500/[0.07] shadow-[0_0_50px_-12px_rgba(99,102,241,0.45)]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-brand-500/30"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-glow">
                    Más elegido
                  </span>
                )}
                <h2 className="font-display text-lg font-semibold text-white">
                  {p.name}
                </h2>
                {p.description && (
                  <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-slate-400">
                    {p.description}
                  </p>
                )}

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold tabular-nums text-white">
                      {fmt(p.priceMensual)}
                    </span>
                    <span className="text-sm text-slate-400">/mes</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    o {fmt(p.priceAnual)} anual · ahorra{" "}
                    {Math.round((1 - p.priceAnual / (p.priceMensual * 12)) * 100)}%
                  </div>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                        <Check className="h-3 w-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/planes/contratar?plan=${p.code}`}
                  className={`mt-8 w-full rounded-full py-3 text-sm font-semibold text-white transition hover:-translate-y-px ${
                    highlight
                      ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-glow"
                      : "border border-white/15 bg-white/[0.06] hover:bg-white/10"
                  }`}
                >
                  Contratar {p.name}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-400 transition hover:text-brand-300">
            Ingresa al panel
          </Link>
        </p>
      </section>
    </main>
  );
}