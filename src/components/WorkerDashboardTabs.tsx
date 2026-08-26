"use client";

import { useState } from "react";
import PersonalShiftsPanel from "@/components/PersonalShiftsPanel";
import TeamCalendar from "@/components/TeamCalendar";
import { ClipboardList, CalendarDays } from "lucide-react";

export default function WorkerDashboardTabs({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<"personal" | "team">("personal");

  const base = "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition";
  const active = "bg-brand-600 text-white";
  const inactive = "text-slate-600 hover:bg-slate-100";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          className={`${base} ${tab === "personal" ? active : inactive}`}
          onClick={() => setTab("personal")}
        >
          <ClipboardList className="inline h-4 w-4" /> Mis turnos personales
        </button>
        <button
          className={`${base} ${tab === "team" ? active : inactive}`}
          onClick={() => setTab("team")}
        >
          <CalendarDays className="inline h-4 w-4" /> Calendario del equipo
        </button>
      </div>

      {tab === "personal" ? (
        <PersonalShiftsPanel />
      ) : (
        <TeamCalendar currentUserId={currentUserId} />
      )}
    </div>
  );
}
