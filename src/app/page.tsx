import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarRange,
  FileSpreadsheet,
  Landmark,
  Layers,
  Megaphone,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";

import type { Metadata } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos";

export const metadata: Metadata = {
  title: "Turnos de equipo por organización",
  description:
    "El diario mural digital de turnos para organizaciones con varias sucursales, departamentos y cargos. Planifica, publica y comunica los turnos de tu equipo en un solo lugar.",
};

const CAPABILITIES = [
  "Turnos por cargo",
  "Múltiples sucursales",
  "Mural de avisos",
  "Encuestas y votos",
  "Notificaciones",
  "Roles y permisos",
  "Exportación a Excel",
  "Historial completo",
];

const HIERARCHY = [
  {
    icon: Landmark,
    title: "Empresa",
    desc: "Un contrato único para toda tu operación.",
  },
  {
    icon: Building2,
    title: "Organización",
    desc: "Cada sucursal u organización gestiona su propio equipo.",
  },
  {
    icon: Layers,
    title: "Departamentos",
    desc: "Ordena al equipo por unidad y área de trabajo.",
  },
  {
    icon: Users,
    title: "Cargos",
    desc: "Filtra el calendario del equipo por rol y responsabilidad.",
  },
];

const FEATURES = [
  {
    icon: CalendarRange,
    title: "Calendario del equipo",
    desc: "Cada organización ve su equipo completo o filtrado por cargo.",
    big: true,
  },
  {
    icon: Megaphone,
    title: "Mural de avisos",
    desc: "Publica novedades para todo el equipo o por sucursal.",
  },
  {
    icon: Vote,
    title: "Encuestas y votaciones",
    desc: "Consulta disponibilidad y preferencias con una votación simple.",
  },
  {
    icon: BellRing,
    title: "Notificaciones por correo",
    desc: "Avisos por email cuando cambia un turno o llega un aviso.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    desc: "Super admin, admin y trabajador con alcance por sucursal.",
  },
  {
    icon: FileSpreadsheet,
    title: "Exportación a Excel",
    desc: "Descarga turnos y planillas para reportes y archivo.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050510] text-slate-100">
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
            <a href="#funciones" className="transition hover:text-white">
              Funciones
            </a>
            <a href="#estructura" className="transition hover:text-white">
              Estructura
            </a>
            <Link href="/planes" className="transition hover:text-white">
              Precios
            </Link>
            <a href="#acceso" className="transition hover:text-white">
              Acceso
            </a>
          </nav>

          <Link href="/login" className="btn-primary">
            Ingresar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Tu equipo. Tus turnos. Un solo mural.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
            El diario mural digital de turnos para organizaciones con varias
            sucursales, departamentos y cargos.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/planes" className="btn-primary px-6 py-3 text-[15px]">
              Contrata aquí <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-ghost px-5 py-3 text-[15px]">
              Ingresar
            </Link>
            <a
              href="#funciones"
              className="btn-ghost px-5 py-3 text-[15px]"
            >
              Ver funciones
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-[28px] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(99,102,241,0.25),transparent_70%)]"
          />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <img
              src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1400&q=75"
              alt="Recepción de una clínica moderna donde se coordina el equipo de turnos"
              className="aspect-[4/3] w-full object-cover saturate-[0.9]"
              loading="eager"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#050510]/85 via-[#050510]/10 to-transparent" />

            <div className="rise absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
                <div className="font-display text-sm font-semibold text-white">
                  Central · Norte · Iquique
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Tu equipo, organizado por sucursal y cargo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES MARQUEE */}
      <section aria-label="Capacidades del servicio" className="border-y border-white/[0.08] bg-white/[0.02]">
        <div className="overflow-hidden py-5">
          <div className="marquee-track flex w-max items-center gap-10">
            {[...CAPABILITIES, ...CAPABILITIES].map((cap, i) => (
              <span
                key={`${cap}-${i}`}
                className="flex items-center gap-3 whitespace-nowrap text-sm font-medium tracking-wide text-slate-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONES */}
      <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Todo lo que necesita una operación con turnos.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
            Planifica, publica y comunica los turnos de tu equipo sin planillas
            sueltas ni avisos perdidos.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition duration-300 hover:border-brand-500/40 hover:bg-white/[0.05] ${
                f.big ? "md:col-span-4" : "md:col-span-2"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ESTRUCTURA */}
      <section
        id="estructura"
        className="border-y border-white/[0.08] bg-white/[0.02] py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
              Jerarquía
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              De la empresa al cargo, todo conectado.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
            {HIERARCHY.map((h, i) => (
              <div key={h.title} className="flex items-center gap-4 md:flex-none">
                {i > 0 && (
                  <ArrowRight
                    aria-hidden
                    className="hidden h-5 w-5 shrink-0 rotate-90 text-slate-600 md:inline-block md:rotate-0"
                  />
                )}
                <div className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-400">
                      <h.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-[15px] font-semibold text-white">
                      {h.title}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                    {h.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESO */}
      <section id="acceso" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 lg:px-8 lg:py-28">
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center shadow-soft lg:px-12 lg:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_-10%,rgba(99,102,241,0.18),transparent_65%)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              ¿Tu empresa ya contrató el servicio?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-400">
              Entra al panel para gestionar organizaciones, sucursales,
              departamentos y cargos de tu equipo, o contrata un plan nuevo.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/planes" className="btn-primary px-7 py-3 text-[15px]">
                Contrata aquí <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-ghost px-7 py-3 text-[15px]">
                Ingresar al panel
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-slate-400">
              {APP_NAME} · Panel para clientes contratantes
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <a href="#funciones" className="transition hover:text-slate-300">
              Funciones
            </a>
            <a href="#estructura" className="transition hover:text-slate-300">
              Estructura
            </a>
            <Link href="/planes" className="transition hover:text-slate-300">
              Precios
            </Link>
            <Link href="/login" className="transition hover:text-slate-300">
              Ingresar
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}