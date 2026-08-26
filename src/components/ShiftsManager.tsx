"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ShiftForm, { UserOption } from "@/components/ShiftForm";
import {
  SHIFT_TYPE_STYLES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_STYLES,
  fmtTime,
  fmtDate,
  hoursBetween,
} from "@/lib/format";
import { ListChecks, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useShiftTypeLabels } from "@/components/ShiftTypeLabelsProvider";


export interface ShiftRow {
  id: string;
  date: string | Date;
  start: string | Date;
  end: string | Date;
  type: any;
  status: string;
  name: string | null;
  notes: string | null;
  userId: string;
  user: { id: string; name: string; department: string | null };
}

export default function ShiftsManager({
  shifts,
  users,
}: {
  shifts: ShiftRow[];
  users: UserOption[];
}) {
  const router = useRouter();
  const { t } = useShiftTypeLabels();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<ShiftRow | null>(null);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este turno?")) return;
    setBusy(id);
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  const filtered = filter ? shifts.filter((s) => s.userId === filter) : shifts;

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><ListChecks className="h-5 w-5 text-brand-600" /> Todos los turnos</h2>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-medium text-brand-600">
          + Registrar turno para un trabajador
        </summary>
        <div className="mt-3">
          <ShiftForm users={users} />
        </div>
      </details>

      <div className="overflow-x-auto">
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Trabajador</th>
              <th className="py-2 pr-2">Fecha</th>
              <th className="py-2 pr-2">Horario</th>
              <th className="py-2 pr-2">Tipo</th>
              <th className="py-2 pr-2">Horas</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-400">
                  Sin turnos.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
            <tr key={s.id} className="border-b border-slate-100">
              <td className="py-2 pr-2 font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  <Avatar name={s.user.name} size="sm" />
                  <span>
                    {s.user.name}
                    {s.name && (
                      <div className="text-xs font-normal text-slate-500">{s.name}</div>
                    )}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-2 text-slate-500">{fmtDate(s.date)}</td>
              <td className="py-2 pr-2 text-slate-500">
                {fmtTime(s.start)}–{fmtTime(s.end)}
              </td>
              <td className="py-2 pr-2">
                <span className={`badge border ${SHIFT_TYPE_STYLES[s.type as string]}`}>
                  {t(s.type as string)}
                </span>
              </td>
              <td className="py-2 pr-2">
                <span className={`badge border ${SHIFT_STATUS_STYLES[s.status as string]}`}>
                  {SHIFT_STATUS_LABELS[s.status as string]}
                </span>
              </td>
              <td className="py-2 pr-2 text-slate-500">{hoursBetween(s.start, s.end)}h</td>
              <td className="py-2 pr-2 text-right whitespace-nowrap">
                <button
                  onClick={() => setEditing(s)}
                  className="text-xs text-brand-600 hover:underline mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(s.id)}
                  disabled={busy === s.id}
                  className="text-xs text-red-500 hover:underline disabled:opacity-40"
                >
                  {busy === s.id ? "..." : "Eliminar"}
                </button>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Editar turno</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ShiftForm
              users={users}
              editing={{
                id: editing.id,
                userId: editing.userId,
                date:
                  typeof editing.date === "string"
                    ? editing.date
                    : editing.date.toISOString(),
                start:
                  typeof editing.start === "string"
                    ? editing.start
                    : editing.start.toISOString(),
                end:
                  typeof editing.end === "string"
                    ? editing.end
                    : editing.end.toISOString(),
                type: editing.type,
                name: editing.name,
                notes: editing.notes,
                status: editing.status,
              }}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
