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

  const isManager = role === "admin" || role === "superadmin";
  const roleLabel =
    role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin" : null;

  const links: { href: string; label: string }[] = isManager
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
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 tracking-tight">
          <span className="h-8 w-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-soft">
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
                className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium ${
                  pathname === l.href
                    ? "bg-brand-100 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/perfil"
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium ${
                pathname === "/perfil"
                  ? "bg-brand-100 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Mi perfil
            </Link>
          </nav>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
            <Avatar name={name} size="sm" className="hidden sm:flex" />
            <span className="text-sm text-slate-600 hidden sm:block">
              {name}
              {roleLabel && (
                <span
                  className={`badge ml-1 ${
                    role === "superadmin"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-brand-100 text-brand-700"
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
            <button onClick={logout} disabled={busy} className="btn-ghost px-3 py-1.5">
              {busy ? "..." : "Salir"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}