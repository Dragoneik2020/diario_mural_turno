"use client";

import { useState, useEffect } from "react";
import { SHIFT_TYPE_KEYS } from "@/lib/shiftTypes";

export default function ShiftTypeLabelsEditor() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        setLabels(d.labels || {});
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function update(key: string, val: string) {
    setLabels((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/shift-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMsg("Etiquetas guardadas");
    } catch {
      setMsg("No se pudieron guardar las etiquetas");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="card">
      <h3 className="card-title">Nombre de los tipos de turno</h3>
      <p className="text-sm text-gray-500 mb-3">
        Personaliza cómo se muestran los tipos de turno en toda la app.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SHIFT_TYPE_KEYS.map((k) => (
          <div key={k}>
            <label className="block text-xs text-gray-500 mb-1 capitalize">
              {k}
            </label>
            <input
              className="input"
              value={labels[k] ?? ""}
              onChange={(e) => update(k, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        className="btn-primary mt-3"
        onClick={save}
        disabled={busy}
      >
        {busy ? "Guardando…" : "Guardar etiquetas"}
      </button>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
    </div>
  );
}
