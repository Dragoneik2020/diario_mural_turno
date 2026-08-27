"use client";

import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/trabajadores", label: "Trabajadores" },
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
    ? [...TABS.slice(0, 2), { href: "/admin/sucursales", label: "Sucursales" }, ...TABS.slice(2)]
    : TABS;
  return (
    <div className="sticky top-14 z-10 flex gap-2 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition ${
            current === t.href
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}