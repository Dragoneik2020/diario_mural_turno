export const SHIFT_TYPE_LABELS: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  completo: "Completo",
  otro: "Otro",
};

export const SHIFT_TYPE_STYLES: Record<string, string> = {
  manana: "bg-amber-100 text-amber-800 border-amber-200",
  tarde: "bg-orange-100 text-orange-800 border-orange-200",
  noche: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  otro: "bg-slate-100 text-slate-700 border-slate-200",
};

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  asignado: "Asignado",
  confirmado: "Confirmado",
  cumplido: "Cumplido",
};

export const SHIFT_STATUS_STYLES: Record<string, string> = {
  asignado: "bg-slate-100 text-slate-600 border-slate-200",
  confirmado: "bg-sky-100 text-sky-700 border-sky-200",
  cumplido: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function fmtTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function fmtWeekday(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", { weekday: "long" });
}

export function hoursBetween(start: string | Date, end: string | Date): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.round((e.getTime() - s.getTime()) / 36e5 * 10) / 10;
}

export function todayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function toKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
