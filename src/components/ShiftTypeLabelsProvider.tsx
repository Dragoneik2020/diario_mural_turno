"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DEFAULT_SHIFT_TYPE_LABELS, SHIFT_TYPE_KEYS } from "@/lib/shiftTypes";

interface Ctx {
  labels: Record<string, string>;
  t: (k: string) => string;
}

const ShiftTypeCtx = createContext<Ctx>({
  labels: DEFAULT_SHIFT_TYPE_LABELS,
  t: (k: string) => DEFAULT_SHIFT_TYPE_LABELS[k] || k,
});

export function ShiftTypeLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_SHIFT_TYPE_LABELS);

  useEffect(() => {
    fetch("/api/settings/shift-types")
      .then((r) => r.json())
      .then((d) => {
        if (d.labels) setLabels({ ...DEFAULT_SHIFT_TYPE_LABELS, ...d.labels });
      })
      .catch(() => {});
  }, []);

  const t = (k: string) => labels[k] || k;

  return <ShiftTypeCtx.Provider value={{ labels, t }}>{children}</ShiftTypeCtx.Provider>;
}

export function useShiftTypeLabels() {
  return useContext(ShiftTypeCtx);
}

export { SHIFT_TYPE_KEYS };
