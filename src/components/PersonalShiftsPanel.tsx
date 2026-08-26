"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fmtTime,
  fmtWeekday,
  fmtDate,
  hoursBetween,
  SHIFT_TYPE_STYLES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
} from "@/lib/format";
import { ClipboardList, CalendarOff } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";

interface PersShift {
  id: string;
  date: string;
  start: string;
  end: string;
  type: string;
  status: string;
  name: string | null;
  notes: string | null;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function key(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default function PersonalShiftsPanel() {
  const [shifts, setShifts] = useState<PersShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { t } = useShiftTypeLabels();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/shifts");
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      setShifts(d.shifts);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/shifts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  const grouped = (() => {
    const map = new Map<string, PersShift[]>();
    for (const s of shifts) {
      const k = key(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([k, items]) => {
        const d = new Date(k + "T00:00:00");
        return {
          key: k,
          label: `${fmtWeekday(d)} · ${fmtDate(d)}`,
          month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          items,
        };
      });
  })();

  // agrupar por mes para encabezados
  const sections: { month: string; entries: typeof grouped }[] = [];
  for (const g of grouped) {
    const last = sections[sections.length - 1];
    if (!last || last.month !== g.month) sections.push({ month: g.month, entries: [g] });
    else last.entries.push(g);
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-brand-600" /> Mis turnos personales</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : shifts.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No tienes turnos asignados" />
      ) : (
        <div className="space-y-5">
          {sections.map((sec) => (
            <div key={sec.month}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {sec.month}
              </div>
              <ul className="space-y-2">
                {sec.entries.map((e) => (
                  <li key={e.key} className="text-sm font-medium text-slate-600 mb-1">
                    <div className="text-slate-500">{e.label}</div>
                    {e.items.map((s) => (
                      <div
                        key={s.id}
                        className="mt-1 rounded-xl border border-slate-200 p-3 bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            {s.name && (
                              <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                            )}
                            <div className="text-sm font-medium text-slate-800">
                              {fmtTime(s.start)} – {fmtTime(s.end)} · {hoursBetween(s.start, s.end)}h
                            </div>
                            <div className="mt-1 flex gap-1">
                              <span className={`badge border ${SHIFT_TYPE_STYLES[s.type]}`}>
                                {t(s.type)}
                              </span>
                              <span className={`badge border ${SHIFT_STATUS_STYLES[s.status]}`}>
                                {SHIFT_STATUS_LABELS[s.status]}
                              </span>
                            </div>
                          </div>
                          {s.status !== "cumplido" && (
                            <div className="flex flex-col gap-1">
                              {s.status === "asignado" && (
                                <button
                                  onClick={() => setStatus(s.id, "confirmado")}
                                  disabled={busy === s.id}
                                  className="btn-primary px-2 py-1 text-xs"
                                >
                                  {busy === s.id ? "…" : "Confirmar"}
                                </button>
                              )}
                              <button
                                onClick={() => setStatus(s.id, "cumplido")}
                                disabled={busy === s.id}
                                className="btn-ghost px-2 py-1 text-xs"
                              >
                                Marcar cumplido
                              </button>
                            </div>
                          )}
                        </div>
                        {s.notes && <p className="text-xs text-slate-500 mt-1">{s.notes}</p>}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
