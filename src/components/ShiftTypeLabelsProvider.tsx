"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  DEFAULT_SHIFT_TYPE_LABELS,
  DEFAULT_SHIFT_TYPE_SCHEDULES,
  SHIFT_TYPE_KEYS,
  ShiftTypeSchedule,
} from "@/lib/shiftTypes";

interface Ctx {
  labels: Record<string, string>;
  t: (k: string) => string;
  schedules: Record<string, ShiftTypeSchedule>;
  sched: (k: string) => ShiftTypeSchedule | undefined;
}

const ShiftTypeCtx = createContext<Ctx>({
  labels: DEFAULT_SHIFT_TYPE_LABELS,
  t: (k: string) => DEFAULT_SHIFT_TYPE_LABELS[k] || k,
  schedules: DEFAULT_SHIFT_TYPE_SCHEDULES,
  sched: (k: string) => DEFAULT_SHIFT_TYPE_SCHEDULES[k],
});

export function ShiftTypeLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_SHIFT_TYPE_LABELS);
  const [schedules, setSchedules] = useState<Record<string, ShiftTypeSchedule>>(
    DEFAULT_SHIFT_TYPE_SCHEDULES
  );

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        if (d.labels) setLabels({ ...DEFAULT_SHIFT_TYPE_LABELS, ...d.labels });
        if (d.schedules) setSchedules({ ...DEFAULT_SHIFT_TYPE_SCHEDULES, ...d.schedules });
      })
      .catch(() => {});
  }, []);

  const t = (k: string) => labels[k] || k;
  const sched = (k: string) => schedules[k] || DEFAULT_SHIFT_TYPE_SCHEDULES[k];

  return (
    <ShiftTypeCtx.Provider value={{ labels, t, schedules, sched }}>
      {children}
    </ShiftTypeCtx.Provider>
  );
}

export function useShiftTypeLabels() {
  return useContext(ShiftTypeCtx);
}

export function useShiftTypeSchedules() {
  const { schedules, sched } = useContext(ShiftTypeCtx);
  return { schedules, sched };
}

export { SHIFT_TYPE_KEYS };