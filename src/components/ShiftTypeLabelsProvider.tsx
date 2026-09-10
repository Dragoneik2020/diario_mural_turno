"use client";

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import {
  DEFAULT_SHIFT_TYPE_LABELS,
  DEFAULT_SHIFT_TYPE_SCHEDULES,
  SHIFT_TYPE_KEYS,
  ShiftTypeSchedule,
} from "@/lib/shiftTypes";

export interface ShiftTypeCustomItem {
  key: string;
  label: string;
  start: string;
  end: string;
}

interface Ctx {
  labels: Record<string, string>;
  t: (k: string) => string;
  schedules: Record<string, ShiftTypeSchedule>;
  sched: (k: string) => ShiftTypeSchedule | undefined;
  keys: string[];
  custom: ShiftTypeCustomItem[];
}

const baseCtx: Ctx = {
  labels: DEFAULT_SHIFT_TYPE_LABELS,
  t: (k: string) => DEFAULT_SHIFT_TYPE_LABELS[k] || k,
  schedules: DEFAULT_SHIFT_TYPE_SCHEDULES,
  sched: (k: string) => DEFAULT_SHIFT_TYPE_SCHEDULES[k],
  keys: SHIFT_TYPE_KEYS,
  custom: [],
};

const ShiftTypeCtx = createContext<Ctx>(baseCtx);

export function ShiftTypeLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({ ...DEFAULT_SHIFT_TYPE_LABELS });
  const [schedules, setSchedules] = useState<Record<string, ShiftTypeSchedule>>({
    ...DEFAULT_SHIFT_TYPE_SCHEDULES,
  });
  const [custom, setCustom] = useState<ShiftTypeCustomItem[]>([]);

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        const lbl = { ...DEFAULT_SHIFT_TYPE_LABELS };
        const sch = { ...DEFAULT_SHIFT_TYPE_SCHEDULES };
        const cus: ShiftTypeCustomItem[] = Array.isArray(d.custom) ? d.custom : [];
        if (d.labels) Object.assign(lbl, d.labels);
        if (d.schedules) Object.assign(sch, d.schedules);
        for (const c of cus) {
          lbl[c.key] = c.label;
          sch[c.key] = { start: c.start, end: c.end };
        }
        setLabels(lbl);
        setSchedules(sch);
        setCustom(cus);
      })
      .catch(() => {});
  }, []);

  const t = (k: string) => labels[k] || k;
  const sched = (k: string) => schedules[k] || DEFAULT_SHIFT_TYPE_SCHEDULES[k];
  const keys = useMemo(() => [...SHIFT_TYPE_KEYS, ...custom.map((c) => c.key)], [custom]);

  return (
    <ShiftTypeCtx.Provider value={{ labels, t, schedules, sched, keys, custom }}>
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