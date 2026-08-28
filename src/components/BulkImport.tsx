"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { parseCSV } from "@/lib/csv";
import { X } from "lucide-react";

interface Props {
  onDone: () => void;
  branches?: { id: string; name: string }[];
  superadmin?: boolean;
  defaultBranchId?: string;
}

interface PreviewRow {
  name: string;
  email: string;
  department: string;
  cargo: string;
  role: string;
  password: string;
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
    const header = rows[0].map(normalize);
    const hasHeader =
      header.some((h) => h.includes("email") || h.includes("correo")) &&
      header.some((h) => h.includes("nombre") || h.includes("name"));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const idx = (keys: string[]) => {
      for (const k of keys) {
        const i = header.findIndex((h) => h.includes(k));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iName = hasHeader ? idx(["nombre", "name"]) : 0;
    const iEmail = hasHeader ? idx(["email", "correo"]) : 1;
    const iDept = hasHeader ? idx(["departamento", "depto"]) : 2;
    const iCargo = hasHeader ? idx(["cargo"]) : 3;
    const iPass = hasHeader ? idx(["contraseña", "password", "clave"]) : 4;
    const iRole = hasHeader ? idx(["rol", "role"]) : 5;

    return dataRows.map((r) => {
      const name = (r[iName] || "").trim();
      const email = (r[iEmail] || "").trim();
      const department = (r[iDept] || "").trim();
      const cargo = (r[iCargo] || "").trim();
      const password = (r[iPass] || "").trim();
      const role = (r[iRole] || defaultRole).trim() || defaultRole;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const err = !name ? "Falta nombre" : !emailOk ? "Email inválido" : undefined;
      return { name, email, department, cargo, role, password, error: err };
    });
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/api/users/template";
    a.download = "ejemplo_trabajadores.xlsx";
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
        department: p.department || undefined,
        cargo: p.cargo || undefined,
        role: p.role,
        password: p.password || undefined,
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Importar trabajadores (CSV)</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-2">
              Columnas (en orden, con o sin cabecera): <b>Nombre, Email, Departamento, Cargo, Contraseña, Rol</b>.
              La contraseña puede dejarse vacía si defines una por defecto.
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
                      <th className="py-1 px-2">Email</th>
                      <th className="py-1 px-2">Depto.</th>
                      <th className="py-1 px-2">Cargo</th>
                      <th className="py-1 px-2">Rol</th>
                      <th className="py-1 px-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1 px-2">{p.name}</td>
                        <td className="py-1 px-2">{p.email}</td>
                        <td className="py-1 px-2">{p.department || "—"}</td>
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
              <div className="text-sm mb-3 p-3 rounded-lg bg-slate-50">
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
