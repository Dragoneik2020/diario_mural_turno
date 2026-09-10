"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useShiftTypeLabels,
  useShiftTypeSchedules,
} from "@/components/ShiftTypeLabelsProvider";

export interface UserOption {
  id: string;
  name: string;
  department: string | null;
  rut?: string | null;
}

export interface EditableShift {
  id: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  type: string;
  name: string | null;
  notes: string | null;
  status: string;
}

function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return d.toTimeString().slice(0, 5);
}

export default function ShiftForm({
  users,
  defaultUserId,
  editing,
  onDone,
}: {
  users?: UserOption[];
  defaultUserId?: string;
  editing?: EditableShift | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { t, keys } = useShiftTypeLabels();
  const { sched } = useShiftTypeSchedules();
  const [userId, setUserId] = useState(defaultUserId || users?.[0]?.id || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [type, setType] = useState("completo");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("asignado");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setUserId(editing.userId);
      setDate(toDateInput(editing.date));
      setStart(toTimeInput(editing.start));
      setEnd(toTimeInput(editing.end));
      setType(editing.type);
      setName(editing.name || "");
      setNotes(editing.notes || "");
      setStatus(editing.status);
    }
  }, [editing]);

  function changeType(k: string) {
    setType(k);
    const s = sched(k);
    if (s) {
      setStart(s.start);
      setEnd(s.end);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const payload: any = {
      userId: users ? userId : undefined,
      date,
      start,
      end,
      type,
      name: name || undefined,
      notes: notes || undefined,
    };
    if (editing) payload.status = status;

    const res = await fetch(editing ? `/api/shifts/${editing.id}` : "/api/shifts", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar el turno");
      return;
    }
    setName("");
    setNotes("");
    if (!editing) {
      // modo "registrar varios": el formulario queda listo para el próximo turno
      setSaved(true);
      window.setTimeout(() => setSaved(false), 4000);
    }
    router.refresh();
    if (onDone) onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {users && (
        <div>
          <label className="label">Trabajador</label>
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.department ? ` · ${u.department}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Nombre del turno</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Guardia festival, Refuerzo mañana…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={type} onChange={(e) => changeType(e.target.value)}>
            {keys.map((k) => (
              <option key={k} value={k}>{t(k)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Inicio</label>
          <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label className="label">Fin</label>
          <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
      </div>

      {editing && (
        <div>
          <label className="label">Estado</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="asignado">Asignado</option>
            <option value="confirmado">Confirmado</option>
            <option value="cumplido">Cumplido</option>
          </select>
        </div>
      )}

      <div>
        <label className="label">Notas</label>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {saved && !editing && (
        <div className="text-sm text-green-600">Turno registrado. Puedes seguir agregando más.</div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Guardando..." : editing ? "Guardar cambios" : "Registrar turno"}
      </button>
    </form>
  );
}
