"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Credenciales incorrectas");
      return;
    }
    const { session } = await res.json();
    router.push(
      session.role === "admin" ||
        session.role === "superadmin" ||
        session.role === "dios"
        ? "/admin"
        : "/dashboard"
    );
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050510] text-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1600&q=80"
          alt=""
          className="h-full w-full object-cover opacity-20 saturate-150"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(99,102,241,0.15)_0%,transparent_60%),linear-gradient(180deg,rgba(5,5,16,0.2)_0%,#050510_100%)]" />
      </div>

      <Link
        href="/"
        className="fixed left-5 top-5 z-20 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-white/10"
      >
        ← Volver al inicio
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 rise">
        <div className="w-full max-w-[400px] rounded-3xl border border-white/[0.08] bg-white/[0.04] p-9 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow">
              <CalendarCheck className="h-9 w-9" />
            </div>
            <div>
              <h1 className="font-display text-[1.3rem] font-bold text-white">
                {APP_NAME}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Panel de administración
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="tu@correo.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-br from-brand-500 to-brand-600 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-px hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Entrar →"}
            </button>
          </form>

          <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-100">Cuentas de demostración</strong>
            <br />
            <span className="badge !border-rose-400/30 !bg-rose-100 !text-rose-700 mt-1 mr-1">
              DIOS
            </span>
            admin@demo.com / admin123
            <br />
            <span className="badge !border-amber-400/30 !bg-amber-100 !text-amber-700 mr-1">
              Super Admin
            </span>
            super@demo.com / admin123
            <br />
            <span className="badge !border-brand-400/30 !bg-brand-100 !text-brand-700 mr-1">
              Admin
            </span>
            central@demo.com / admin123
            <br />
            <span className="badge !border-slate-400/30 !bg-slate-100 !text-slate-300 mr-1">
              Trabajador
            </span>
            ana@demo.com / trabajador123
          </div>
        </div>
      </div>
    </main>
  );
}