"use client";

import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/trabajadores", label: "Trabajadores" },
  { href: "/admin/categorias", label: "Deptos. y cargos" },
  { href: "/admin/turnos", label: "Gestión de turnos" },
  { href: "/admin/muro", label: "Muro" },
  { href: "/admin/notificaciones", label: "Notificaciones" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export default function AdminTopTabs({
  current,
  superadmin = false,
}: {
  current: string;
  superadmin?: boolean;
}) {
  const tabs = superadmin
    ? [
        ...TABS.slice(0, 2),
        { href: "/admin/sucursales", label: "Sucursales" },
        { href: "/admin/empresas", label: "Empresas" },
        ...TABS.slice(2),
      ]
    : TABS;
  return (
    <div className="sticky top-14 z-10 flex gap-1.5 w-fit max-w-full overflow-x-auto rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
            current === t.href
              ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow"
              : "text-slate-300 hover:bg-white/10"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}