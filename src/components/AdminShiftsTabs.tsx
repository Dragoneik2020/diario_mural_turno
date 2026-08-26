"use client";

import { useState } from "react";
import ShiftsManager, { ShiftRow } from "@/components/ShiftsManager";
import { UserOption } from "@/components/ShiftForm";
import LlamadosPorTrabajador from "@/components/LlamadosPorTrabajador";
import { ListChecks, Phone } from "lucide-react";

export default function AdminShiftsTabs({
  shifts,
  users,
}: {
  shifts: ShiftRow[];
  users: UserOption[];
}) {
  const [tab, setTab] = useState<"all" | "calls">("all");

  const base = "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition";
  const active = "bg-brand-600 text-white";
  const inactive = "text-slate-600 hover:bg-slate-100";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          className={`${base} ${tab === "all" ? active : inactive}`}
          onClick={() => setTab("all")}
        >
          <ListChecks className="inline h-4 w-4" /> Todos los turnos
        </button>
        <button
          className={`${base} ${tab === "calls" ? active : inactive}`}
          onClick={() => setTab("calls")}
        >
          <Phone className="inline h-4 w-4" /> Días de llamados
        </button>
      </div>

      {tab === "all" ? (
        <ShiftsManager shifts={shifts} users={users} />
      ) : (
        <LlamadosPorTrabajador />
      )}
    </div>
  );
}
