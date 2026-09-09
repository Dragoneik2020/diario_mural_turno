"use client";

import { useState, useEffect } from "react";
import {
  DEFAULT_SHIFT_TYPE_SCHEDULES,
  SHIFT_TYPE_KEYS,
  ShiftTypeSchedule,
} from "@/lib/shiftTypes";

interface SchedulesState {
  [key: string]: ShiftTypeSchedule;
}

export default function ShiftTypeLabelsEditor() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<SchedulesState>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        setLabels(d.labels || {});
        setSchedules(d.schedules || {});
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function updateLabel(key: string, val: string) {
    setLabels((prev) => ({ ...prev, [key]: val }));
  }

  function updateSchedule(key: string, field: "start" | "end", val: string) {
    setSchedules((prev) => ({
      ...prev,
      [key]: {
        start: field === "start" ? val : prev[key]?.start ?? DEFAULT_SHIFT_TYPE_SCHEDULES[key]?.start ?? "",
        end: field === "end" ? val : prev[key]?.end ?? DEFAULT_SHIFT_TYPE_SCHEDULES[key]?.end ?? "",
      },
    }));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/shift-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels, schedules }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMsg("Nombres y horarios guardados");
    } catch {
      setMsg("No se pudieron guardar los cambios");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="card">
      <h3 className="card-title">Nombre de los tipos de turno</h3>
      <p className="text-sm text-gray-500 mb-3">
        Personaliza cómo se muestran los tipos de turno en toda la app y define el
        horario por defecto de cada tipo. Al elegir un tipo al registrar un turno,
        se precargará su horario (un fin menor que el inicio = turno nocturno que cruza
        de día).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SHIFT_TYPE_KEYS.map((k) => (
          <div key={k} className="rounded-xl border border-gray-200 p-3">
            <label className="block text-xs text-gray-500 mb-1 capitalize">{k}</label>
            <input
              className="input"
              value={labels[k] ?? ""}
              onChange={(e) => updateLabel(k, e.target.value)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Inicio</label>
                <input
                  className="input"
                  type="time"
                  value={schedules[k]?.start ?? ""}
                  onChange={(e) => updateSchedule(k, "start", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Fin</label>
                <input
                  className="input"
                  type="time"
                  value={schedules[k]?.end ?? ""}
                  onChange={(e) => updateSchedule(k, "end", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary mt-3" onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Guardar nombres y horarios"}
      </button>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
    </div>
  );
}