"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DailyPoint, TypeBreakdown } from "@/lib/metrics";

export interface MetricsData {
  totalHours: number;
  totalShifts: number;
  avgHoursPerShift?: number;
  daily: DailyPoint[];
  byType: TypeBreakdown[];
}

const COLORS = ["#1d57f5", "#10b981", "#f59e0b", "#6366f1", "#94a3b8"];

export default function MetricsView({
  metrics,
  title,
}: {
  metrics: MetricsData;
  title: string;
}) {
  const dailyData = metrics.daily.map((d) => ({
    name: d.date.slice(5),
    Horas: d.hours,
    Turnos: d.shifts,
  }));

  const typeData = metrics.byType.map((t) => ({ name: t.label, value: t.hours }));

  const statCards = [
    { label: "Horas totales", value: `${metrics.totalHours}h` },
    { label: "Turnos", value: metrics.totalShifts },
    {
      label: "Prom. por turno",
      value: metrics.avgHoursPerShift != null ? `${metrics.avgHoursPerShift}h` : "—",
    },
  ];

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-4">{title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-center">
            <div className="text-xl font-bold text-brand-700">{c.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="Horas" fill="#1d57f5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {typeData.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-slate-600 mb-2">Distribución por tipo</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={70}
                  label={(e: any) => `${e.name}: ${e.value}h`}
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
