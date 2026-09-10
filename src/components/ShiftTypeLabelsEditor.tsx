"use client";

import { useState, useEffect } from "react";
import {
  DEFAULT_SHIFT_TYPE_SCHEDULES,
  SHIFT_TYPE_KEYS,
  ShiftTypeSchedule,
} from "@/lib/shiftTypes";
import { Plus, X } from "lucide-react";

interface SchedulesState {
  [key: string]: ShiftTypeSchedule;
}

interface CustomItem {
  key: string;
  label: string;
  start: string;
  end: string;
}

function nextCustomKey(existing: CustomItem[]): string {
  const used = new Set(existing.map((c) => c.key));
  let i = 1;
  while (used.has("custom" + i)) i++;
  return "custom" + i;
}

export default function ShiftTypeLabelsEditor() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<SchedulesState>({});
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        setLabels(d.labels || {});
        setSchedules(d.schedules || {});
        setCustom(Array.isArray(d.custom) ? d.custom : []);
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

  function addCustom() {
    const key = nextCustomKey(custom);
    const next = [...custom, { key, label: "TIPO NUEVO", start: "09:00", end: "17:00" }];
    setCustom(next);
    setLabels((prev) => ({ ...prev, [key]: "" }));
    setSchedules((prev) => ({ ...prev, [key]: { start: "09:00", end: "17:00" } }));
  }

  function updateCustom(idx: number, field: keyof CustomItem, val: string) {
    setCustom((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  }

  function removeCustom(idx: number) {
    setCustom((prev) => {
      const removed = prev[idx];
      if (removed) {
        setLabels((l) => {
          const nl = { ...l };
          delete nl[removed.key];
          return nl;
        });
        setSchedules((s) => {
          const ns = { ...s };
          delete ns[removed.key];
          return ns;
        });
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/shift-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels, schedules, custom }),
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
        Personaliza cómo se muestran los tipos de turno en toda la app, define el horario por
        defecto de cada tipo y agrega tipos nuevos. Al elegir un tipo al registrar un turno, se
        precargará su horario (un fin menor que el inicio = turno nocturno que cruza de día).
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
        {custom.map((c, idx) => (
          <div key={c.key} className="rounded-xl border border-dashed border-brand-400 bg-brand-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs text-gray-500">Tipo extra ({c.key})</label>
              <button
                onClick={() => removeCustom(idx)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar este tipo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              className="input"
              value={c.label}
              onChange={(e) => updateCustom(idx, "label", e.target.value)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Inicio</label>
                <input
                  className="input"
                  type="time"
                  value={c.start}
                  onChange={(e) => updateCustom(idx, "start", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Fin</label>
                <input
                  className="input"
                  type="time"
                  value={c.end}
                  onChange={(e) => updateCustom(idx, "end", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addCustom}
        className="btn-ghost mt-3 inline-flex items-center gap-1 text-brand-600"
      >
        <Plus className="h-4 w-4" /> Agregar tipo de turno
      </button>
      <button className="btn-primary mt-3 ml-2" onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Guardar nombres y horarios"}
      </button>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
    </div>
  );
}