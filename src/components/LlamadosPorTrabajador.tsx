"use client";

import { useState, useEffect, useMemo } from "react";
import {
  SHIFT_TYPE_STYLES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
  fmtDate,
  fmtTime,
  fmtWeekday,
  hoursBetween,
} from "@/lib/format";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";
import { Phone } from "lucide-react";

interface ShiftUser {
  id: string;
  name: string;
  department: string | null;
}

interface Shift {
  id: string;
  date: string;
  start: string;
  end: string;
  type: string;
  status: string;
  user: ShiftUser;
}

interface ApiUser {
  id: string;
  name: string;
  department: string | null;
  role?: string;
}

export default function LlamadosPorTrabajador() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { t } = useShiftTypeLabels();

  useEffect(() => {
    (async () => {
      const [s, u] = await Promise.all([
        fetch("/api/shifts").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
      ]);
      setShifts(Array.isArray(s.shifts) ? s.shifts : []);
      const list = Array.isArray(u) ? u : u.users || [];
      setUsers(list.filter((x: ApiUser) => x.role !== "admin" && x.role !== "superadmin" && x.role !== "dios"));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = selected === "all" ? shifts : shifts.filter((s) => s.user.id === selected);
    return [...list].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [shifts, selected]);

  const summary = useMemo(() => {
    const days = new Set(filtered.map((s) => s.date.slice(0, 10)));
    const hours = filtered.reduce(
      (acc, s) => acc + hoursBetween(s.start, s.end),
      0
    );
    const byType: Record<string, number> = {};
    for (const s of filtered) byType[s.type] = (byType[s.type] || 0) + 1;
    return { days: days.size, count: filtered.length, hours, byType };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of filtered) {
      const key = s.start.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: new Date(key + "-01T00:00:00").toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
      items,
    }));
  }, [filtered]);

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Phone className="h-5 w-5 text-brand-600" /> Días de llamados por trabajador</h2>
        <select
          className="input max-w-xs"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="all">Todos los trabajadores</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Días llamados" value={summary.days} />
            <Stat label="Turnos" value={summary.count} />
            <Stat label="Horas totales" value={`${summary.hours}h`} />
            <Stat
              label="Por tipo"
              value={Object.entries(summary.byType)
                .map(([tt, n]) => `${t(tt)}: ${n}`)
                .join(" · ") || "—"}
            />
          </div>

          {grouped.length === 0 && (
            <p className="text-sm text-slate-400">Sin días de llamados.</p>
          )}

          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 capitalize">
                  {g.label}
                </div>
                <ul className="divide-y divide-slate-100">
                  {g.items.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {fmtDate(s.start)}{" "}
                          <span className="text-slate-400 font-normal">
                            ({fmtWeekday(s.start)})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {fmtTime(s.start)}–{fmtTime(s.end)} · {hoursBetween(s.start, s.end)}h
                          {selected === "all" && (
                            <> · {s.user.name}</>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span className={`badge border ${SHIFT_TYPE_STYLES[s.type]}`}>
                          {t(s.type)}
                        </span>
                        <span className={`badge border ${SHIFT_STATUS_STYLES[s.status]}`}>
                          {SHIFT_STATUS_LABELS[s.status] || s.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-brand-700 break-words">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{label}</div>
    </div>
  );
}
