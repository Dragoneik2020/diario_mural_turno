"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  fmtDate,
  fmtTime,
  hoursBetween,
  SHIFT_TYPE_STYLES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
} from "@/lib/format";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";
import { X, ChevronRight, Users, CalendarDays, Clock, Activity, AlertCircle, type LucideIcon } from "lucide-react";
import Avatar from "@/components/Avatar";

interface U {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  active: boolean;
}
interface S {
  id: string;
  date: string | Date;
  start: string | Date;
  end: string | Date;
  type: string;
  status: string;
  name: string | null;
  user: { id: string; name: string; department: string | null };
}
interface Metrics {
  totalWorkers: number;
  totalShifts: number;
  totalHours: number;
  activeToday: number;
  pendingConfirmation: number;
  byType?: { type: string; label: string; count: number; hours: number }[];
}

type Tab = "workers" | "shifts" | "hours" | "active" | "pending" | null;

export default function AdminStats({
  metrics,
  workers,
  monthShifts,
  pendingShifts,
  todayShifts,
}: {
  metrics: Metrics;
  workers: U[];
  monthShifts: S[];
  pendingShifts: S[];
  todayShifts: S[];
}) {
  const router = useRouter();
  const { t } = useShiftTypeLabels();
  const [open, setOpen] = useState<Tab>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function confirmShift(id: string) {
    setBusy(id);
    await fetch(`/api/shifts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmado" }),
    });
    setBusy(null);
    setOpen(null);
    router.refresh();
  }

  const activeWorkers = Array.from(
    new Map(todayShifts.map((s) => [s.user.id, s.user])).values()
  );

  const hoursByWorker = (() => {
    const m = new Map<string, { name: string; hours: number }>();
    for (const s of monthShifts) {
      const h = hoursBetween(s.start, s.end);
      const cur = m.get(s.user.id) || { name: s.user.name, hours: 0 };
      cur.hours += h;
      m.set(s.user.id, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.hours - a.hours);
  })();

  const cards: { key: "workers" | "shifts" | "hours" | "active" | "pending"; label: string; value: string | number; hint: string }[] = [
    { key: "workers", label: "Trabajadores", value: metrics.totalWorkers, hint: "Ver lista" },
    { key: "shifts", label: "Turnos (30d)", value: metrics.totalShifts, hint: "Ver detalle" },
    { key: "hours", label: "Horas (30d)", value: `${metrics.totalHours}h`, hint: "Desglose" },
    { key: "active", label: "Activos hoy", value: metrics.activeToday, hint: "Ver hoy" },
    { key: "pending", label: "Pend. confirmar", value: metrics.pendingConfirmation, hint: "Confirmar" },
  ];

  const CARD_META: Record<"workers" | "shifts" | "hours" | "active" | "pending", { icon: LucideIcon; tint: string }> = {
    workers: { icon: Users, tint: "bg-brand-50 text-brand-600" },
    shifts: { icon: CalendarDays, tint: "bg-indigo-50 text-indigo-600" },
    hours: { icon: Clock, tint: "bg-emerald-50 text-emerald-600" },
    active: { icon: Activity, tint: "bg-sky-50 text-sky-600" },
    pending: { icon: AlertCircle, tint: "bg-amber-50 text-amber-600" },
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => {
          const meta = CARD_META[c.key];
          return (
            <button
              key={c.key}
              onClick={() => setOpen(c.key)}
              className="card text-center py-4 hover:border-brand-400 transition cursor-pointer"
            >
              <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${meta.tint}`}>
                <meta.icon className="h-5 w-5" />
              </span>
              <div className="kpi-value">{c.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">{c.label}</div>
              <div className="text-[10px] text-brand-500 mt-0.5 flex items-center justify-center gap-0.5">
                {c.hint} <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 py-8 sm:items-center sm:py-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-lift max-h-[85vh] overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {open === "workers" && "Trabajadores"}
                {open === "shifts" && "Turnos (últimos 30 días)"}
                {open === "hours" && "Horas (últimos 30 días)"}
                {open === "active" && "Activos hoy"}
                {open === "pending" && "Pendientes de confirmar"}
              </h3>
              <button onClick={() => setOpen(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {open === "workers" && (
              <table className="table w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Depto.</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} size="sm" />
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-slate-500">{u.email}</td>
                      <td className="py-2 text-slate-500">{u.department || "—"}</td>
                      <td className="py-2">
                        <span
                          className={`badge border ${u.active ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                        >
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {open === "shifts" && (
              <div className="text-sm">
                <p className="text-slate-500 mb-3">Total: {metrics.totalShifts} turnos en los últimos 30 días.</p>
                <ul className="space-y-2">
                  {monthShifts.map((s) => (
                    <li key={s.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.user.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-800">{s.user.name}</div>
                          <div className="text-xs text-slate-500">
                            {fmtDate(s.date)} · {fmtTime(s.start)}–{fmtTime(s.end)} ·{" "}
                            {hoursBetween(s.start, s.end)}h
                          </div>
                        </div>
                      </div>
                        <div className="flex gap-1">
                          <span className={`badge border ${SHIFT_TYPE_STYLES[s.type]}`}>
                            {t(s.type)}
                          </span>
                          <span className={`badge border ${SHIFT_STATUS_STYLES[s.status]}`}>
                            {SHIFT_STATUS_LABELS[s.status]}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                  {monthShifts.length === 0 && (
                    <li className="text-slate-400">Sin turnos en el período.</li>
                  )}
                </ul>
              </div>
            )}

            {open === "hours" && (
              <div className="text-sm space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Por tipo
                  </div>
                  {(metrics.byType || []).map((b) => (
                    <div key={b.type} className="flex items-center gap-2 mb-1">
                      <span className="w-24 text-slate-600">{b.label}</span>
                      <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-brand-500"
                          style={{
                            width: `${metrics.totalShifts ? (b.count / metrics.totalShifts) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-slate-500 w-10 text-right">{b.count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Por trabajador
                  </div>
                  <ul className="space-y-1">
                    {hoursByWorker.map((h) => (
                      <li key={h.name} className="flex justify-between text-slate-700">
                        <span>{h.name}</span>
                        <span className="font-medium">{h.hours}h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {open === "active" && (
              <div className="text-sm">
                <p className="text-slate-500 mb-3">
                  {activeWorkers.length} trabajador(es) con turno hoy.
                </p>
                <ul className="space-y-2">
                  {todayShifts.map((s) => (
                    <li key={s.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.user.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-800">{s.user.name}</div>
                          <div className="text-xs text-slate-500">
                            {fmtTime(s.start)}–{fmtTime(s.end)} ·{" "}
                            {s.name || t(s.type)}
                          </div>
                        </div>
                      </div>
                      <span className={`badge border ${SHIFT_STATUS_STYLES[s.status]}`}>
                        {SHIFT_STATUS_LABELS[s.status]}
                      </span>
                    </li>
                  ))}
                  {todayShifts.length === 0 && (
                    <li className="text-slate-400">Sin turnos hoy.</li>
                  )}
                </ul>
              </div>
            )}

            {open === "pending" && (
              <div className="text-sm">
                <p className="text-slate-500 mb-3">
                  {pendingShifts.length} turno(s) sin confirmar.
                </p>
                <ul className="space-y-2">
                  {pendingShifts.map((s) => (
                    <li key={s.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.user.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-800">{s.user.name}</div>
                          <div className="text-xs text-slate-500">
                            {fmtDate(s.date)} · {fmtTime(s.start)}–{fmtTime(s.end)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => confirmShift(s.id)}
                        disabled={busy === s.id}
                        className="btn-primary px-2 py-1 text-xs"
                      >
                        {busy === s.id ? "…" : "Confirmar"}
                      </button>
                    </li>
                  ))}
                  {pendingShifts.length === 0 && (
                    <li className="text-slate-400">Sin pendientes.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
