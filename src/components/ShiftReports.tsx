"use client";

import { useState, useEffect } from "react";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";
import { FileDown } from "lucide-react";

interface ReportUser {
  id: string;
  name: string;
  role?: string;
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

const ESTADO: Record<string, string> = {
  asignado: "Asignado",
  confirmado: "Confirmado",
  cumplido: "Cumplido",
};

export default function ShiftReports() {
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [worker, setWorker] = useState<string>("all");
  const [mode, setMode] = useState<"month" | "week" | "custom">("month");
  const [monthValue, setMonthValue] = useState(monthNow());
  const [weekValue, setWeekValue] = useState(isoWeekNow());
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const { t } = useShiftTypeLabels();

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        const list: ReportUser[] = Array.isArray(d) ? d : d.users || [];
        setUsers(list.filter((u) => u.role !== "admin" && u.role !== "superadmin" && u.role !== "dios"));
      });
  }, []);

  async function exportReport() {
    setBusy(true);
    const { from, to, label } = computeRange(mode, monthValue, weekValue, fromDate, toDate);
    const url = `/api/shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(worker !== "all" ? `${url}&userId=${worker}` : url);
    const data = await res.json();
    const shifts: ReportShift[] = (data.shifts || []).sort(
      (a: ReportShift, b: ReportShift) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );

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
        ESTADO[s.status] || s.status,
      ]
        .map(csvCell)
        .join(",");
    });

    const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-turnos-${label.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><FileDown className="h-5 w-5 text-brand-600" /> Reportes de turnos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Rango</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="month">Mes</option>
            <option value="week">Semana</option>
            <option value="custom">Días personalizados</option>
          </select>
        </div>
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
      </div>

      {mode === "month" && (
        <div className="mb-3">
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
        <div className="mb-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
        </div>
      )}

      <button onClick={exportReport} disabled={busy} className="btn-primary">
        {busy ? "Generando…" : "Exportar reporte (CSV)"}
      </button>
      <p className="text-xs text-slate-400 mt-2">
        Descarga un archivo CSV (abrible en Excel) con los turnos del rango seleccionado.
      </p>
    </section>
  );
}
