"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { parseCSV } from "@/lib/csv";
import { X } from "lucide-react";
import { formatRut, isValidRut } from "@/lib/rut";

interface Props {
  onDone: () => void;
  branches?: { id: string; name: string; company?: string }[];
  superadmin?: boolean;
  defaultBranchId?: string;
}

interface PreviewRow {
  name: string;
  email: string;
  rut: string;
  department: string;
  cargo: string;
  role: string;
  password: string;
  sucursal: string;
  branchId?: string;
  companyId?: string;
  error?: string;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function BulkImport({ onDone, branches = [], superadmin = false, defaultBranchId = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [defaultRole, setDefaultRole] = useState("worker");
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  function handleFile(file: File) {
    setError("");
    setResult(null);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = XLSX.read(reader.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
          setPreview(buildPreview(rows as string[][]));
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
      } catch (e: any) {
        setError("No se pudo leer el archivo CSV");
      }
    };
    reader.readAsText(file);
  }

  function buildPreview(rows: string[][]): PreviewRow[] {
    if (!rows || rows.length === 0) return [];

    // Busca la fila de encabezados en las primeras 10 filas
    // (la planilla de ejemplo trae título en la fila 1 y encabezados en la 3).
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const h = (rows[i] || []).map(normalize);
      const hasContact = h.some((x) => x.includes("email") || x.includes("correo"));
      const hasPeople =
        h.some((x) => x.includes("nombre") || x.includes("name")) ||
        h.some((x) => x.includes("sucursal") || x.includes("apellido"));
      if (hasContact && hasPeople) {
        headerIdx = i;
        break;
      }
    }

    const header = headerIdx >= 0 ? rows[headerIdx].map(normalize) : rows[0].map(normalize);
    const hasHeader = headerIdx >= 0;
    const dataRows = (headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows).filter((r) =>
      (r || []).some((c) => String(c || "").trim() !== "")
    );

    const idx = (keys: string[]) => {
      for (const k of keys) {
        const i = header.findIndex((h) => h.includes(k));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iName = hasHeader ? idx(["nombre", "name"]) : 0;
    const iAp1 = hasHeader ? idx(["apellido paterno"]) : -1;
    const iAp2 = hasHeader ? idx(["apellido materno"]) : -1;
    const iEmail = hasHeader ? idx(["email", "correo"]) : 1;
    const iRut = hasHeader ? idx(["rut"]) : 2;
    const iDept = hasHeader ? idx(["departamento", "depto"]) : 2;
    const iCargo = hasHeader ? idx(["cargo"]) : 3;
    const iPass = hasHeader ? idx(["clave", "contraseña", "password"]) : 4;
    const iRole = hasHeader ? idx(["rol", "role"]) : 5;
    const iSuc = hasHeader ? idx(["sucursal"]) : -1;

    const resolveBranch = (sucursal: string): string | undefined => {
      if (!sucursal || branches.length === 0) return undefined;
      const q = normalize(sucursal);
      for (const b of branches) {
        // soporta etiquetas "Empresa · Sucursal": compara con la parte cruda
        const raw = b.name.includes("·") ? b.name.split("·").pop()!.trim() : b.name;
        if (normalize(raw) === q) return b.id;
      }
      for (const b of branches) {
        const raw = b.name.includes("·") ? b.name.split("·").pop()!.trim() : b.name;
        if (normalize(raw).includes(q) || q.includes(normalize(raw))) return b.id;
      }
      return undefined;
    };

    return dataRows.map((r) => {
      const ap1 = (iAp1 >= 0 ? r[iAp1] : "") || "";
      const ap2 = (iAp2 >= 0 ? r[iAp2] : "") || "";
      const parts = [(r[iName] || "").trim(), ap1.trim(), ap2.trim()].filter(Boolean);
      const name = parts.join(" ");
      const email = (r[iEmail] || "").trim();
      const rutRaw = iRut >= 0 ? (r[iRut] || "").trim() : "";
      const rut = formatRut(rutRaw);
      const department = (r[iDept] || "").trim();
      const cargo = (r[iCargo] || "").trim();
      const password = (r[iPass] || "").trim();
      const rawRole = (r[iRole] || "").trim().toLowerCase();
      const role =
        rawRole === "trabajador" ? "worker" : rawRole || defaultRole;
      const sucursal = iSuc >= 0 ? (r[iSuc] || "").trim() : "";
      const resolved = superadmin ? resolveBranch(sucursal) : undefined;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const rutOk = !rutRaw || isValidRut(rutRaw);
      const err = !name
        ? "Falta nombre"
        : !emailOk
          ? "Email inválido"
          : !rutOk
            ? "RUT inválido (usa 17969468-9)"
            : sucursal && superadmin && !resolved
              ? "Sucursal no encontrada"
              : undefined;
      return { name, email, rut, department, cargo, role, password, sucursal, branchId: resolved, error: err };
    });
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/api/users/template";
    a.download = "Planilla_trabajadores_ejemplo.xlsx";
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
        name: p.name,
        email: p.email,
        rut: p.rut || undefined,
        department: p.department || undefined,
        cargo: p.cargo || undefined,
        role: p.role,
        password: p.password || undefined,
        ...(superadmin && p.branchId ? { branchId: p.branchId } : {}),
      }));
    try {
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          defaultPassword: defaultPassword || undefined,
          ...(superadmin && branchId ? { branchId } : {}),
        }),
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
      <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
        ⬆ Importar masivamente
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-white/10 bg-[#0c0c1c] p-5 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Importar trabajadores (Excel/CSV)</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-2">
              Usa la planilla <b>Planilla_trabajadores_ejemplo.xlsx</b> (o CSV): columnas{" "}
              <b>RUT, Nombre, Apellido Paterno, Apellido Materno, telefono, correo electronico, Sucursal, Cargo, Clave de acceso</b>.
              La columna Sucursal asigna cada trabajador a su sucursal por nombre. El <b>RUT</b> es el usuario de acceso a la app; el teléfono es informativo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Contraseña por defecto</label>
                <input
                  className="input"
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="Opcional si el CSV trae contraseñas"
                />
              </div>
              <div>
                <label className="label">Rol por defecto</label>
                <select className="input" value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)}>
                  <option value="worker">Trabajador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {superadmin && branches.length > 0 && (
                <div>
                  <label className="label">Sucursal destino</label>
                  <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              <button type="button" className="btn-secondary text-sm" onClick={downloadTemplate}>
                ⬇ Descargar ejemplo
              </button>
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto border rounded-xl mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-1 px-2">Nombre</th>
                      <th className="py-1 px-2">RUT</th>
                      <th className="py-1 px-2">Email</th>
                      <th className="py-1 px-2">Sucursal</th>
                      <th className="py-1 px-2">Cargo</th>
                      <th className="py-1 px-2">Rol</th>
                      <th className="py-1 px-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1 px-2">{p.name}</td>
                        <td className="py-1 px-2">{p.rut || "—"}</td>
                        <td className="py-1 px-2">{p.email}</td>
                        <td className="py-1 px-2">{p.sucursal || "—"}</td>
                        <td className="py-1 px-2">{p.cargo || "—"}</td>
                        <td className="py-1 px-2">{p.role}</td>
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
                {result.errors?.length > 0 && (
                  <ul className="mt-1 text-red-600 text-xs list-disc pl-4">
                    {result.errors.slice(0, 10).map((e: any, i: number) => (
                      <li key={i}>{e.email}: {e.error}</li>
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
