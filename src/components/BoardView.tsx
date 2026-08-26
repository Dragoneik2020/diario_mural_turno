"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, CalendarOff } from "lucide-react";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_STYLES,
  fmtTime,
  fmtDate,
  fmtWeekday,
  hoursBetween,
  todayKey,
  toKey,
} from "@/lib/format";


export interface BoardShift {
  id: string;
  date: string | Date;
  start: string | Date;
  end: string | Date;
  type: any;
  notes: string | null;
  userId: string;
  user: { id: string; name: string; department: string | null };
}

function dayLabel(d: string | Date): string {
  const key = toKey(d);
  if (key === todayKey()) return "Hoy";
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  if (toKey(t) === todayKey()) return "Mañana";
  return `${fmtWeekday(d)} · ${fmtDate(d)}`;
}

export default function BoardView({ shifts }: { shifts: BoardShift[] }) {
  const groups = new Map<string, BoardShift[]>();
  for (const s of shifts) {
    const key = toKey(s.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const days = Array.from(groups.keys()).sort();

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Megaphone className="h-5 w-5 text-brand-600" /> Mural de turnos</h2>
        <span className="text-xs text-slate-400">Próximos 7 días</span>
      </div>

      {days.length === 0 && (
        <EmptyState
          icon={CalendarOff}
          title="No hay turnos programados"
          hint="Los turnos de los próximos 7 días aparecerán aquí."
        />
      )}

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day}>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {dayLabel(groups.get(day)![0].date)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groups.get(day)!.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={s.user.name} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {s.user.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fmtTime(s.start)} – {fmtTime(s.end)} ·{" "}
                        {hoursBetween(s.start, s.end)}h
                      </div>
                    </div>
                  </div>
                  <span className={`badge border ${SHIFT_TYPE_STYLES[s.type as string]}`}>
                    {SHIFT_TYPE_LABELS[s.type as string]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
