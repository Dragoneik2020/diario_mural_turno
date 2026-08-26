"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fmtTime,
  fmtDate,
  fmtWeekday,
  SHIFT_TYPE_STYLES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
} from "@/lib/format";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";

interface TeamShift {
  id: string;
  date: string;
  start: string;
  end: string;
  type: string;
  status: string;
  name: string | null;
  user: { id: string; name: string; department: string | null; cargo: string | null };
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const DOT: Record<string, string> = {
  manana: "bg-amber-400",
  tarde: "bg-orange-400",
  noche: "bg-indigo-400",
  completo: "bg-emerald-400",
  otro: "bg-slate-400",
};

function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TeamCalendar({ currentUserId }: { currentUserId: string }) {
  const today = new Date();
  const { t } = useShiftTypeLabels();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(key(today));
  const [shifts, setShifts] = useState<TeamShift[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0, 23, 59, 59);
    const res = await fetch(
      `/api/team-shifts?from=${first.toISOString()}&to=${last.toISOString()}`
    );
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      setShifts(d.shifts);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  const map = new Map<string, TeamShift[]>();
  for (const s of shifts) {
    const k = (typeof s.date === "string" ? new Date(s.date) : s.date).toISOString().slice(0, 10);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }

  const selectedShifts = map.get(selected) ?? [];

  const cells: (number | null)[] = [];
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-brand-600" /> Calendario del equipo</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="btn-ghost px-2 py-1"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-slate-600 min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => changeMonth(1)} className="btn-ghost px-2 py-1"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {loading && <div className="text-xs text-slate-400 mb-2">Cargando…</div>}

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400 mb-1">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const cellDate = new Date(year, month, d);
          const k = key(cellDate);
          const dayShifts = map.get(k) ?? [];
          const isToday = k === key(today);
          const isSelected = k === selected;
          const isMine = dayShifts.some((s) => s.user.id === currentUserId);
          return (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center relative transition
                ${isSelected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}
                ${isToday ? "font-bold text-brand-700" : "text-slate-700"}
                ${isMine ? "ring-2 ring-emerald-300" : ""}`}
            >
              <span>{d}</span>
              {dayShifts.length > 0 && (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${DOT[dayShifts[0].type] || "bg-slate-400"}`} />
              )}
              {dayShifts.length > 1 && (
                <span className="absolute top-0.5 right-1 text-[9px] text-slate-400">
                  +{dayShifts.length - 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Mis turnos (resaltado)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Mañana
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-400" /> Tarde
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-400" /> Noche
        </span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="text-sm font-medium text-slate-700 mb-2">
          {selected === key(today) ? "Hoy" : `${fmtWeekday(selected)} · ${fmtDate(selected)}`}
        </div>
        {selectedShifts.length === 0 && (
          <p className="text-sm text-slate-400">Sin turnos este día.</p>
        )}
        <ul className="space-y-2">
          {selectedShifts.map((s) => {
            const mine = s.user.id === currentUserId;
            return (
              <li
                key={s.id}
                className={`rounded-xl border p-3 ${mine ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.user.name} size="sm" />
                      <span className="text-sm font-semibold text-slate-800">{s.user.name}</span>
                    </div>
                    {s.user.cargo && <div className="text-xs text-slate-400">{s.user.cargo}</div>}
                    {s.name && <div className="text-xs text-slate-500">{s.name}</div>}
                    <div className="text-sm text-slate-700">
                      {fmtTime(s.start)} – {fmtTime(s.end)}
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
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
