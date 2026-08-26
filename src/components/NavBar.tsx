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
}: {
  name: string;
  role: AppRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const links: { href: string; label: string }[] =
    role === "admin"
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
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">
            {process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos"}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              pathname === "/perfil"
                ? "bg-brand-100 text-brand-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Mi perfil
          </Link>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-slate-200">
            <Avatar name={name} size="sm" className="hidden sm:flex" />
            <span className="text-sm text-slate-600 hidden sm:block">
              {name}
              {role === "admin" && (
                <span className="badge bg-brand-100 text-brand-700 ml-1">Admin</span>
              )}
            </span>
            <button onClick={logout} disabled={busy} className="btn-ghost px-3 py-1.5">
              {busy ? "..." : "Salir"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
