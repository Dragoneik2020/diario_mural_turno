"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      session.role === "admin" || session.role === "superadmin"
        ? "/admin"
        : "/dashboard"
    );
    router.refresh();
  }

  return (
    <main className="min-h-screen flex rise">
      <div className="hidden lg:flex w-1/2 bg-brand-600 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <CalendarCheck className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            El diario mural de turnos de tu equipo
          </h2>
          <p className="mt-4 text-brand-100 max-w-sm">
            Planifica, asigna y comunica los turnos en un solo lugar. Tus
            trabajadores, siempre informados.
          </p>
        </div>
        <div className="relative text-sm text-brand-200">
          © {new Date().getFullYear()} · Demo
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2 text-brand-700 font-bold text-lg">
            <span className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </span>
            {APP_NAME}
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-xs text-slate-500 card">
            <p className="font-semibold text-slate-600 mb-1">Cuentas de demostración</p>
            <p>
              <span className="badge bg-rose-100 text-rose-700 mr-1">Super Admin</span>{" "}
              admin@demo.com / admin123
            </p>
            <p>
              <span className="badge bg-brand-100 text-brand-700 mr-1">Admin Central</span>{" "}
              central@demo.com / admin123
            </p>
            <p>
              <span className="badge bg-brand-100 text-brand-700 mr-1">Admin Norte</span>{" "}
              norte@demo.com / admin123
            </p>
            <p>
              <span className="badge bg-slate-100 text-slate-600 mr-1">Trabajador</span>{" "}
              ana@demo.com / trabajador123
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
