"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppRole } from "@/lib/auth";
import { Calendar } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function NavBar({
  name,
  role,
  branchName,
}: {
  name: string;
  role: AppRole;
  branchName?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const isManager = role === "admin" || role === "superadmin" || role === "dios";
  const roleLabel =
    role === "dios"
      ? "DIOS"
      : role === "superadmin"
        ? "Super Admin"
        : role === "admin"
          ? "Admin"
          : null;

  const links: { href: string; label: string }[] =
    role === "dios"
      ? [
          { href: "/admin/empresas", label: "Empresas" },
          { href: "/admin/cuentas", label: "Cuentas" },
          { href: "/admin/reportes", label: "Reportes" },
        ]
      : isManager
        ? [
            { href: "/admin", label: "Panel Admin" },
            { href: "/admin/turnos", label: "Gestión de turnos" },
            { href: "/dashboard", label: "Mi vista" },
          ]
        : [{ href: "/dashboard", label: "Mi panel" }];

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050510]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-white tracking-tight">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-glow">
            <Calendar className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">
            {process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos"}
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto min-w-0">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/perfil"
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-full text-sm font-medium transition ${
                pathname === "/perfil"
                  ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              Mi perfil
            </Link>
          </nav>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-white/10 shrink-0">
            <Avatar name={name} size="sm" className="hidden sm:flex" />
            <span className="text-sm text-slate-200 hidden sm:block">
              {name}
              {roleLabel && (
                <span
                  className={`badge ml-1 ${
                    role === "dios"
                      ? "!bg-rose-100 !text-rose-700"
                      : role === "superadmin"
                        ? "!bg-amber-100 !text-amber-700"
                        : "!bg-brand-100 !text-brand-700"
                  }`}
                >
                  {roleLabel}
                </span>
              )}
              {branchName && (
                <span className="block text-[11px] text-slate-400 leading-tight">
                  {branchName}
                </span>
              )}
            </span>
            <button onClick={logout} disabled={busy} className="btn-primary !px-3 !py-1.5">
              {busy ? "..." : "Salir"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}