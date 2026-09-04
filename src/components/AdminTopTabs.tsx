"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, DoorOpen } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/cuentas", label: "Cuentas" },
  { href: "/admin/categorias", label: "Deptos. y cargos" },
  { href: "/admin/turnos", label: "Gestión de turnos" },
  { href: "/admin/muro", label: "Muro" },
  { href: "/admin/notificaciones", label: "Notificaciones" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

const DIOS_GLOBAL_TABS = [
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/sitio", label: "Sitio web" },
  { href: "/admin/planes", label: "Planes" },
  { href: "/admin/notificaciones", label: "Notificaciones" },
];

const DIOS_SCOPED_TABS = [
  { href: "/admin/cuentas", label: "Cuentas" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/sucursales", label: "Sucursales" },
  { href: "/admin/categorias", label: "Deptos. y cargos" },
  { href: "/admin/turnos", label: "Gestión de turnos" },
];

export default function AdminTopTabs({
  current,
  superadmin = false,
  isDios = false,
}: {
  current: string;
  superadmin?: boolean;
  isDios?: boolean;
}) {
  const [scope, setScope] = useState<{ companyId: string; companyName: string } | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isDios) return;
    fetch("/api/companies/acceder")
      .then((r) => r.json())
      .then((d) => {
        if (d?.companyId) setScope({ companyId: d.companyId, companyName: d.companyName });
      })
      .catch(() => {});
  }, [isDios]);

  async function leaveCompany() {
    setLeaving(true);
    try {
      await fetch("/api/companies/acceder", { method: "DELETE" });
      setScope(null);
      window.location.reload();
    } catch {
      setLeaving(false);
    }
  }

  const extra = isDios ? [] : superadmin ? [{ href: "/admin/sucursales", label: "Sucursales" }] : [];
  const tabs = isDios
    ? scope
      ? DIOS_SCOPED_TABS
      : DIOS_GLOBAL_TABS
    : extra.length > 0
      ? [
          ...TABS.slice(0, 2),
          ...extra,
          ...TABS.slice(2),
        ]
      : TABS;

  return (
    <div className="sticky top-14 z-10">
      {scope && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3.5 py-2 text-xs text-brand-100">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-300" />
            Vista en modo empresa: <strong>{scope.companyName}</strong> — solo verás/editarás esa empresa.
          </span>
          <button
            onClick={leaveCompany}
            disabled={leaving}
            className="rounded-full border border-brand-500/40 px-3 py-1 font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:opacity-50"
          >
            <DoorOpen className="mr-1 inline h-3.5 w-3.5" />
            {leaving ? "Saliendo…" : "Ver todas las empresas"}
          </button>
        </div>
      )}

      <div className="flex gap-1.5 w-fit max-w-full overflow-x-auto rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              current === t.href
                ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
