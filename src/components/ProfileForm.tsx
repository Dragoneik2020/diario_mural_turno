"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
}

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [department, setDepartment] = useState(initial.department || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    setLoading(true);
    const res = await fetch(`/api/users/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        department: department || undefined,
        password: password || undefined,
      }),
    });
    setLoading(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "No se pudo actualizar el perfil");
      return;
    }
    setPassword("");
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Nombre</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label">Departamento</label>
        <input
          className="input"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div>
        <label className="label">Nueva contraseña</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Dejar en blanco para no cambiar"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {ok && <div className="text-sm text-emerald-600">Perfil actualizado correctamente.</div>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
