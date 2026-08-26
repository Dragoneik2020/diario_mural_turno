"use client";

import { useState, useEffect } from "react";

export default function CargosEditor() {
  const [cargos, setCargos] = useState<string[]>([]);
  const [newCargo, setNewCargo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/cargos")
      .then((r) => r.json())
      .then((d) => {
        setCargos(Array.isArray(d.cargos) ? d.cargos : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function removeAt(i: number) {
    setCargos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function add() {
    const v = newCargo.trim();
    if (!v) return;
    setCargos((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNewCargo("");
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/cargos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cargos }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMsg("Cargos guardados");
    } catch {
      setMsg("No se pudieron guardar los cargos");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="card">
      <h3 className="card-title">Cargos</h3>
      <p className="text-sm text-gray-500 mb-3">
        Define la lista de cargos disponibles para asignar a los trabajadores.
      </p>

      <ul className="space-y-2 mb-3">
        {cargos.length === 0 && (
          <li className="text-sm text-slate-400">Sin cargos configurados.</li>
        )}
        {cargos.map((c, i) => (
          <li key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-800">{c}</span>
            <button
              type="button"
              className="text-red-600 text-sm"
              onClick={() => removeAt(i)}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mb-3">
        <input
          className="input"
          placeholder="Nuevo cargo"
          value={newCargo}
          onChange={(e) => setNewCargo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          Añadir
        </button>
      </div>

      <button className="btn-primary" onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Guardar cargos"}
      </button>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
    </div>
  );
}
