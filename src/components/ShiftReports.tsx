"use client";

import { useState, useEffect, useMemo } from "react";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart2,
  Inbox,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  shiftTypeStyle,
  hoursBetween,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
} from "@/lib/format";

interface ReportUser {
  id: string;
  name: string;
  role?: string;
}
interface ReportCompany {
  id: string;
  name: string;
}
interface ReportShift {
  id: string;
  date: string;
  start: string;
  end: string;
  type: string;
  status: string;
  name: string | null;
  user: { id: string; name: string };
}

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function isoWeekNow(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeRange(
  mode: "month" | "week" | "custom",
  monthValue: string,
  weekValue: string,
  fromDate: string,
  toDate: string
): { from: string; to: string; label: string } {
  if (mode === "month") {
    const [y, m] = monthValue.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0, 23, 59, 59);
    const label = first.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return { from: first.toISOString(), to: last.toISOString(), label };
  }
  if (mode === "week") {
    const [year, wk] = weekValue.split("-W").map(Number);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = (jan4.getDay() + 6) % 7;
    const monday = new Date(year, 0, 4 - jan4Day + (wk - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const label = `${monday.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} – ${sunday.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`;
    return { from: monday.toISOString(), to: sunday.toISOString(), label };
  }
  const from = new Date(fromDate + "T00:00:00");
  const to = new Date(toDate + "T23:59:59");
  return { from: from.toISOString(), to: to.toISOString(), label: `${fromDate} a ${toDate}` };
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const MODES = [
  { key: "month", label: "Mes" },
  { key: "week", label: "Semana" },
  { key: "custom", label: "Días" },
] as const;

export default function ShiftReports({ isDios = false }: { isDios?: boolean }) {
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [companies, setCompanies] = useState<ReportCompany[]>([]);
  const [company, setCompany] = useState<string>("all");
  const [worker, setWorker] = useState<string>("all");
  const [mode, setMode] = useState<"month" | "week" | "custom">("month");
  const [monthValue, setMonthValue] = useState(monthNow());
  const [weekValue, setWeekValue] = useState(isoWeekNow());
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ReportShift[] | null>(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [error, setError] = useState("");
  const { t } = useShiftTypeLabels();

  useEffect(() => {
    const q = isDios && company !== "all" ? `?companyId=${encodeURIComponent(company)}` : "";
    fetch(`/api/users${q}`)
      .then((r) => r.json())
      .then((d) => {
        const list: ReportUser[] = Array.isArray(d) ? d : d.users || [];
        setUsers(list.filter((u) => u.role !== "admin" && u.role !== "superadmin" && u.role !== "dios"));
        setWorker("all");
      })
      .catch(() => {});
  }, [isDios, company]);

  useEffect(() => {
    if (!isDios) return;
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const list: ReportCompany[] = (d?.companies || []).map((c: any) => ({
          id: c.id,
          name: c.name,
        }));
        setCompanies(list);
      })
      .catch(() => {});
  }, [isDios]);

  function buildQuery() {
    const { from, to, label } = computeRange(mode, monthValue, weekValue, fromDate, toDate);
    const base = `/api/shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const q = new URLSearchParams();
    if (worker !== "all") q.set("userId", worker);
    if (isDios && company !== "all") q.set("companyId", company);
    return { url: `${base}&${q.toString()}`, label };
  }

  async function runReport() {
    setBusy(true);
    setError("");
    try {
      const { url, label } = buildQuery();
      const res = await fetch(url);
      const d = await res.json();
      const shifts: ReportShift[] = (d.shifts || []).sort(
        (a: ReportShift, b: ReportShift) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      setData(shifts);
      setRangeLabel(label);
    } catch {
      setData([]);
      setError("No se pudo generar el reporte. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function exportCSV() {
    let shifts = data;
    let label = rangeLabel;
    if (!shifts) {
      setBusy(true);
      try {
        const { url, label: l } = buildQuery();
        const res = await fetch(url);
        const d = await res.json();
        shifts = (d.shifts || []).sort(
          (a: ReportShift, b: ReportShift) =>
            new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        label = l;
      } catch {
        setBusy(false);
        return;
      }
    }

    const header = [
      "Trabajador",
      "Nombre del turno",
      "Fecha",
      "Día",
      "Inicio",
      "Fin",
      "Horas",
      "Tipo",
      "Estado",
    ];
    if (!shifts) return;
    const rows = shifts.map((s) => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      const horas = Math.round(((end.getTime() - start.getTime()) / 36e5) * 10) / 10;
      return [
        s.user.name,
        s.name || "",
        start.toLocaleDateString("es-ES"),
        start.toLocaleDateString("es-ES", { weekday: "long" }),
        start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        end.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        horas,
        t(s.type),
        SHIFT_STATUS_LABELS[s.status] || s.status,
      ]
        .map(csvCell)
        .join(",");
    });

    const csv = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-turnos-${(label || "rango")
      .replace(/\s+/g, "-")
      .toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
  }

  const stats = useMemo(() => {
    if (!data) return null;
    let horas = 0;
    const workers = new Set<string>();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const s of data) {
      horas += hoursBetween(s.start, s.end);
      workers.add(s.user.id);
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      byType[s.type] = (byType[s.type] || 0) + 1;
    }
    return {
      horas: Math.round(horas * 10) / 10,
      workers: workers.size,
      byStatus,
      byType,
      cumplidos: byStatus.cumplido || 0,
    };
  }, [data]);

  const kpis = [
    {
      icon: CalendarDays,
      label: "Turnos",
      value: data ? String(data.length) : "—",
      tint: "text-brand-400 bg-brand-500/15",
    },
    {
      icon: Clock3,
      label: "Horas totales",
      value: data ? `${stats?.horas ?? 0}h` : "—",
      tint: "text-sky-400 bg-sky-500/15",
    },
    {
      icon: Users,
      label: "Trabajadores",
      value: data ? String(stats?.workers ?? 0) : "—",
      tint: "text-emerald-400 bg-emerald-500/15",
    },
    {
      icon: CheckCircle2,
      label: "Cumplidos",
      value: data ? `${stats?.cumplidos ?? 0}/${data.length}` : "—",
      tint: "text-amber-400 bg-amber-500/15",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-violet-500/20 text-brand-400 ring-1 ring-white/10">
              <FileBarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-slate-100">Reportes de turnos</h3>
              <p className="text-xs text-slate-500">
                Resumen visual y exportación del rango seleccionado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runReport} disabled={busy} className="btn-primary">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generando…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Generar reporte
                </>
              )}
            </button>
            <button onClick={exportCSV} disabled={busy} className="btn-ghost">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Rango</label>
            <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    mode === m.key
                      ? "bg-brand-500/25 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {isDios && (
            <div>
              <label className="label">Empresa</label>
              <select className="input" value={company} onChange={(e) => setCompany(e.target.value)}>
                <option value="all">Todas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Trabajador</label>
            <select className="input" value={worker} onChange={(e) => setWorker(e.target.value)}>
              <option value="all">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          {mode === "month" && (
            <div>
              <label className="label">Mes</label>
              <input
                className="input"
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
              />
            </div>
          )}
          {mode === "week" && (
            <div>
              <label className="label">Semana</label>
              <input
                className="input"
                type="week"
                value={weekValue}
                onChange={(e) => setWeekValue(e.target.value)}
              />
            </div>
          )}
          {mode === "custom" && (
            <>
              <div>
                <label className="label">Desde</label>
                <input
                  className="input"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input
                  className="input"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {error && (
        <section className="card border-red-500/30 p-4 text-sm text-red-300">{error}</section>
      )}

      {data && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="panel flex items-center gap-3 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tint}`}
                >
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="kpi-value text-xl sm:text-2xl">{k.value}</div>
                  <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {k.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(Object.keys(stats.byType).length > 0 || Object.keys(stats.byStatus).length > 0) && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="panel p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Por tipo de turno
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <span key={k} className="badge">
                        <span className={`h-2 w-2 rounded-full ${shiftTypeStyle(k).split(" ")[0]}`} />
                        {t(k)} · {v}
                      </span>
                    ))}
                </div>
              </div>
              <div className="panel p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Por estado
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className={`badge ${SHIFT_STATUS_STYLES[k] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {SHIFT_STATUS_LABELS[k] || k} · {v}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          <section className="card p-0">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-400" />
                <h3 className="text-slate-100">
                  {data.length} {data.length === 1 ? "turno" : "turnos"}
                </h3>
              </div>
              <span className="badge">{rangeLabel}</span>
            </div>
            {data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <Inbox className="h-10 w-10 text-slate-600" />
                <p className="text-sm text-slate-400">
                  Sin turnos para el rango seleccionado.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table w-full min-w-[46rem] text-sm">
                    <thead>
                      <tr>
                        <th className="px-5 py-3">Trabajador</th>
                        <th>Fecha</th>
                        <th>Día</th>
                        <th>Horario</th>
                        <th>Horas</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th className="pr-5">Turno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((s) => {
                        const start = new Date(s.start);
                        const end = new Date(s.end);
                        return (
                          <tr key={s.id}>
                            <td className="px-5 py-2.5 font-medium text-slate-200">
                              {s.user.name}
                            </td>
                            <td className="whitespace-nowrap text-slate-300">
                              {start.toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })}
                            </td>
                            <td className="whitespace-nowrap text-slate-500">
                              {capitalize(
                                start.toLocaleDateString("es-ES", { weekday: "long" })
                              )}
                            </td>
                            <td className="whitespace-nowrap tabular-nums text-slate-300">
                              {start.toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" – "}
                              {end.toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="whitespace-nowrap tabular-nums text-slate-400">
                              {hoursBetween(start, end)}h
                            </td>
                            <td>
                              <span className={`badge ${shiftTypeStyle(s.type)}`}>
                                {t(s.type)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${SHIFT_STATUS_STYLES[s.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                              >
                                {SHIFT_STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap pr-5 text-slate-400">
                              {s.name || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Total: {data.length} turnos · {stats.horas}h · {stats.workers}{" "}
                    trabajadores
                  </span>
                  <button
                    onClick={exportCSV}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}