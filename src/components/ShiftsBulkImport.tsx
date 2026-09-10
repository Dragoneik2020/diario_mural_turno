"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { parseCSV } from "@/lib/csv";
import { X } from "lucide-react";
import { formatRut, isValidRut } from "@/lib/rut";
import { SHIFT_TYPE_KEYS } from "@/lib/shiftTypes";

interface Props {
  onDone: () => void;
  users?: { id: string; name: string; rut?: string | null }[];
}

interface PreviewRow {
  rut: string;
  date: string;
  start: string;
  end: string;
  type: string;
  shiftName: string;
  worker: string | null;
  error?: string;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const TYPE_ALIASES: Record<string, string> = {
  manana: "manana",
  morning: "manana",
  tarde: "tarde",
  afternoon: "tarde",
  noche: "noche",
  night: "noche",
  completo: "completo",
  full: "completo",
  otro: "otro",
  other: "otro",
};

/** Convierte una celda de Excel a texto útil según su tipo (fecha u hora). */
function cellToText(v: unknown, kind: "date" | "time"): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (kind === "time") {
      return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
    }
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(
      v.getUTCDate()
    ).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    if (kind === "time" && v >= 0 && v <= 1) {
      const mins = Math.round(v * 24 * 60);
      return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    }
    if (kind === "date" && v > 20000 && v < 80000) {
      // número serial de Excel -> fecha
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;
    }
    return String(v);
  }
  return String(v);
}

/** Acepta AAAA-MM-DD, DD-MM-AAAA/AA (con /, - o .). */
function parseDateStr(raw: string): string | null {
  const v = (raw || "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) {
    const [, y, mo, d] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  let two = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(v);
  if (!two) two = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/.exec(v);
  if (two) {
    const [, d, mo, yRaw] = two;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    const y = Number(yRaw) < 100 ? 2000 + Number(yRaw) : Number(yRaw);
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseTimeStr(raw: string): string | null {
  const m = /^(\d{1,2})\s*[:.hH]\s*(\d{1,2})/.exec((raw || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface TypeInfoItem {
  key: string;
  label: string;
}

/** Clave de turno a partir de cualquier texto (clave custom, label configurado o alias). */
function buildAliasMap(
  labels: Record<string, string>,
  custom: TypeInfoItem[]
): Record<string, string> {
  const map: Record<string, string> = { ...TYPE_ALIASES };
  const add = (label: string, key: string) => {
    const n = normalize(label);
    if (!n) return;
    map[n] = key;
    map[`turno ${n}`] = key;
    map[`tipo ${n}`] = key;
    map[`turno de ${n}`] = key;
  };
  for (const k of SHIFT_TYPE_KEYS) {
    map[k] = k;
    add(labels[k] ?? "", k);
  }
  for (const c of custom) {
    map[c.key] = c.key;
    add(c.label, c.key);
  }
  return map;
}

/** Igual que el servidor: quita prefijos "turno/tipo" y matchea por coincidencia parcial. */
function resolveTypeAlias(
  raw: string,
  aliases: Record<string, string>,
  fallback: string
): string {
  const n = normalize(raw);
  if (aliases[n]) return aliases[n];
  const n2 = n.replace(/^(turno de |tipo de |turno |tipo )+/g, "").trim();
  if (aliases[n2]) return aliases[n2];
  let best = "";
  let bestLen = 0;
  for (const [alias, key] of Object.entries(aliases)) {
    if (alias.length >= 4 && n.includes(alias) && alias.length > bestLen) {
      best = key;
      bestLen = alias.length;
    }
  }
  return best || fallback;
}

export default function ShiftsBulkImport({ onDone, users = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState("completo");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({});
  const [typeCustom, setTypeCustom] = useState<TypeInfoItem[]>([]);
  const [typeSchedules, setTypeSchedules] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        setTypeLabels(d.labels || {});
        const cus = Array.isArray(d.custom) ? d.custom : [];
        setTypeCustom(cus);
        const sch: Record<string, { start: string; end: string }> = {
          ...(d.schedules || {}),
        };
        for (const c of cus) sch[c.key] = { start: c.start, end: c.end };
        setTypeSchedules(sch);
      })
      .catch(() => {});
  }, []);

  const aliases = buildAliasMap(typeLabels, typeCustom);
  const typeLabel = (k: string) =>
    typeLabels[k] || typeCustom.find((c) => c.key === k)?.label || k;
  const allTypeKeys = [...SHIFT_TYPE_KEYS, ...typeCustom.map((c) => c.key)];

  function handleFile(file: File) {
    setError("");
    setResult(null);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
          setPreview(buildPreview(rows as unknown[][]));
        } catch {
          setError("No se pudo leer el archivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        setPreview(buildPreview(parseCSV(text)));
      } catch {
        setError("No se pudo leer el archivo CSV");
      }
    };
    reader.readAsText(file);
  }

  function buildPreview(rows: unknown[][]): PreviewRow[] {
    if (!rows || rows.length === 0) return [];

    // Busca la fila de encabezados en las primeras 10 filas
    // (la planilla de ejemplo trae título en la fila 1 y encabezados en la 3).
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const h = (rows[i] || []).map((c) => normalize(String(c ?? "")));
      const hasRut = h.some((x) => x === "rut" || x.includes("rut"));
      const hasDate = h.some((x) => x.includes("fecha") || x.includes("date"));
      const hasTime = h.some((x) => x.includes("inicio") || x.includes("ingreso"));
      if (hasRut && hasDate && hasTime) {
        headerIdx = i;
        break;
      }
    }

    const header = (headerIdx >= 0 ? rows[headerIdx] : rows[0] || []).map((c) =>
      normalize(String(c ?? ""))
    );
    const dataRows = (headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows.slice(1)).filter((r) =>
      (r || []).some((c) => String(c ?? "").trim() !== "")
    );

    const idx = (keys: string[]) => {
      for (const k of keys) {
        const i = header.findIndex((h) => h.includes(k));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iRut = idx(["rut"]);
    const iDate = idx(["fecha", "date"]);
    const iStart = idx(["inicio", "ingreso", "start"]);
    const iEnd = idx(["fin", "termino", "salida", "end"]);
    const iType = idx(["tipo"]);
    const iName = idx(["nombre del turno", "nombre turno"]);
    const iNotes = idx(["notas", "observaciones"]);

    const rutMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.rut) rutMap.set(normalize(u.rut), u.name);
    });

    return dataRows.map((r) => {
      const rutRaw = iRut >= 0 ? String(r[iRut] ?? "").trim() : "";
      const rut = formatRut(rutRaw);
      const dateRaw = iDate >= 0 ? cellToText(r[iDate], "date") : "";
      const startRaw = iStart >= 0 ? cellToText(r[iStart], "time") : "";
      const endRaw = iEnd >= 0 ? cellToText(r[iEnd], "time") : "";
      const typeRaw = normalize(iType >= 0 ? String(r[iType] ?? "") : "");
      const shiftName = iName >= 0 ? String(r[iName] ?? "").trim() : "";
      const notes = iNotes >= 0 ? String(r[iNotes] ?? "").trim() : "";

      const type = typeRaw ? resolveTypeAlias(typeRaw, aliases, defaultType) : defaultType;
      const dateStr = parseDateStr(dateRaw);
      const sched = typeSchedules[type];
      const startStr = parseTimeStr(startRaw) ?? sched?.start ?? null;
      const endStr = parseTimeStr(endRaw) ?? sched?.end ?? null;
      const rutOk = rutRaw && isValidRut(rutRaw);
      const worker = rutMap.get(normalize(rutRaw)) ?? null;

      const err = !rutRaw
        ? "Falta RUT"
        : !rutOk
          ? "RUT inválido (usa 17969468-9)"
          : users.length > 0 && !worker
            ? "Trabajador no está en tu alcance"
            : !dateStr
              ? "Fecha inválida (DD-MM-AAAA)"
              : !startStr || !endStr
                ? "Horario inválido (HH:mm)"
                : undefined;

      return {
        rut,
        date: dateStr ?? dateRaw,
        start: startStr ?? startRaw,
        end: endStr ?? endRaw,
        type,
        shiftName: shiftName || notes,
        worker,
        error: err,
      };
    });
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/api/shifts/template";
    a.download = "Planilla_turnos_ejemplo.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function importNow() {
    setBusy(true);
    setError("");
    const items = preview
      .filter((p) => !p.error)
      .map((p) => ({
        rut: p.rut,
        date: p.date,
        start: p.start,
        end: p.end,
        type: p.type,
        name: p.shiftName || undefined,
      }));
    try {
      const res = await fetch("/api/shifts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, defaultType }),
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) onDone();
    } catch {
      setError("Error al enviar la importación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
        ⬆ Importar turnos
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-white/10 bg-[#0c0c1c] p-5 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Importar turnos (Excel/CSV)</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-2">
              Usa la planilla <b>Planilla_turnos_ejemplo.xlsx</b> (o CSV): columnas{" "}
              <b>RUT, Nombre (informativo), Fecha, Inicio, Fin, Tipo, Nombre del turno, Notas</b>.
              El <b>RUT</b> identifica al trabajador; cada turno se asigna a la sucursal del trabajador.
              Fecha en <b>DD-MM-AAAA</b>, horas en <b>HH:mm</b>. Si el <b>Fin</b> es menor que el{" "}
              <b>Inicio</b> se interpreta como turno nocturno (cruza medianoche). Reconoce los tipos
              configurados en <b>Ajustes &rarr; Nombre de los tipos de turno</b> (incluye los tipos
              agregados). Se omiten turnos duplicados (mismo trabajador, fecha y hora).
            </p>

            <div className="mb-3">
              <label className="label">Tipo por defecto (si la fila no trae tipo)</label>
              <select className="input" value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
                {allTypeKeys.map((k) => (
                  <option key={k} value={k}>{typeLabel(k)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              <button type="button" className="btn-ghost text-sm" onClick={downloadTemplate}>
                ⬇ Descargar ejemplo
              </button>
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto border rounded-xl mb-3 max-h-64">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-1 px-2">RUT</th>
                      <th className="py-1 px-2">Trabajador</th>
                      <th className="py-1 px-2">Fecha</th>
                      <th className="py-1 px-2">Horario</th>
                      <th className="py-1 px-2">Tipo</th>
                      <th className="py-1 px-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1 px-2">{p.rut || "—"}</td>
                        <td className="py-1 px-2">{p.worker ?? "—"}</td>
                        <td className="py-1 px-2">{p.date}</td>
                        <td className="py-1 px-2">
                          {p.start}–{p.end}
                        </td>
                        <td className="py-1 px-2">{typeLabel(p.type) || p.type}</td>
                        <td className="py-1 px-2">
                          {p.error ? (
                            <span className="text-red-600 text-xs">{p.error}</span>
                          ) : (
                            <span className="text-emerald-600 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

            {result && (
              <div className="text-sm mb-3 p-3 rounded-lg bg-[#151528] border border-white/10">
                <p className="font-medium text-slate-800">
                  Creados: {result.created} · Errores: {result.errors?.length || 0}
                </p>
                {result.createdRows?.length > 0 && (
                  <ul className="mt-1 text-emerald-500 text-xs list-disc pl-4">
                    {result.createdRows.slice(0, 10).map((u: any, i: number) => (
                      <li key={i}>
                        {u.name} · {u.date}
                      </li>
                    ))}
                  </ul>
                )}
                {result.errors?.length > 0 && (
                  <ul className="mt-1 text-red-600 text-xs list-disc pl-4">
                    {result.errors.slice(0, 10).map((e: any, i: number) => (
                      <li key={i}>{e.rut}: {e.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cerrar
              </button>
              <button
                className="btn-primary"
                onClick={importNow}
                disabled={busy || preview.filter((p) => !p.error).length === 0}
              >
                {busy ? "Importando…" : "Confirmar importación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
