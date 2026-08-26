"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_STYLES,
  fmtTime,
  fmtDate,
  hoursBetween,
} from "@/lib/format";
import { CalendarOff } from "lucide-react";
import EmptyState from "@/components/EmptyState";


export interface MyShift {
  id: string;
  date: string | Date;
  start: string | Date;
  end: string | Date;
  type: any;
  notes: string | null;
}

export default function MyShifts({ shifts }: { shifts: MyShift[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este turno?")) return;
    setBusy(id);
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-3">Mis turnos recientes</h2>
      {shifts.length === 0 && (
        <EmptyState icon={CalendarOff} title="Aún no has registrado turnos" />
      )}
      <ul className="divide-y divide-slate-100">
        {shifts.map((s) => (
          <li key={s.id} className="py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">
                {fmtDate(s.date)}{" "}
                <span className={`badge border ${SHIFT_TYPE_STYLES[s.type as string]}`}>
                  {SHIFT_TYPE_LABELS[s.type as string]}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {fmtTime(s.start)} – {fmtTime(s.end)} · {hoursBetween(s.start, s.end)}h
              </div>
            </div>
            <button
              onClick={() => remove(s.id)}
              disabled={busy === s.id}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
            >
              {busy === s.id ? "..." : "Eliminar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
