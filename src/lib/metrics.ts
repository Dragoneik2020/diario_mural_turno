import { prisma } from "./prisma";
import { getShiftTypeLabels } from "./settings";

function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface DailyPoint {
  date: string;
  hours: number;
  shifts: number;
}

export interface TypeBreakdown {
  type: string;
  label: string;
  count: number;
  hours: number;
}

export interface PersonalMetrics {
  totalHours: number;
  totalShifts: number;
  avgHoursPerShift: number;
  byType: TypeBreakdown[];
  daily: DailyPoint[];
}

export interface WorkerSummary {
  userId: string;
  name: string;
  department: string | null;
  hours: number;
  shifts: number;
}

export interface GlobalMetrics {
  totalWorkers: number;
  totalShifts: number;
  totalHours: number;
  activeToday: number;
  pendingConfirmation: number;
  byType: TypeBreakdown[];
  daily: DailyPoint[];
  perWorker: WorkerSummary[];
}

export async function getPersonalMetrics(
  userId: string,
  rangeDays = 30
): Promise<PersonalMetrics> {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (rangeDays - 1));

  const labels = await getShiftTypeLabels();
  const shifts = await prisma.shift.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "asc" },
  });

  const byTypeMap = new Map<string, TypeBreakdown>();
  const dailyMap = new Map<string, DailyPoint>();

  let totalHours = 0;
  for (const s of shifts) {
    const h = hoursBetween(s.start, s.end);
    totalHours += h;

    const t = s.type as string;
    const bt = byTypeMap.get(t) ?? {
      type: t,
      label: labels[t] ?? t,
      count: 0,
      hours: 0,
    };
    bt.count += 1;
    bt.hours += h;
    byTypeMap.set(t, bt);

    const key = startOfDay(s.date).toISOString().slice(0, 10);
    const dp = dailyMap.get(key) ?? { date: key, hours: 0, shifts: 0 };
    dp.hours += h;
    dp.shifts += 1;
    dailyMap.set(key, dp);
  }

  const daily: DailyPoint[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push(dailyMap.get(key) ?? { date: key, hours: 0, shifts: 0 });
  }

  const byType = Array.from(byTypeMap.values()).sort((a, b) => b.hours - a.hours);

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalShifts: shifts.length,
    avgHoursPerShift:
      shifts.length > 0 ? Math.round((totalHours / shifts.length) * 10) / 10 : 0,
    byType,
    daily,
  };
}

export async function getGlobalMetrics(rangeDays = 30): Promise<GlobalMetrics> {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (rangeDays - 1));

  const labels = await getShiftTypeLabels();
  const [workers, shifts, todayShifts, pendingConfirmation] = await Promise.all([
    prisma.user.findMany({
      where: { role: "worker", active: true },
      select: { id: true, name: true, department: true },
    }),
    prisma.shift.findMany({
      where: { date: { gte: from } },
      include: { user: { select: { id: true, name: true, department: true } } },
    }),
    prisma.shift.findMany({
      where: {
        date: {
          gte: startOfDay(new Date()),
          lt: (() => {
            const t = startOfDay(new Date());
            t.setDate(t.getDate() + 1);
            return t;
          })(),
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.shift.count({
      where: { date: { gte: from }, status: "asignado" },
    }),
  ]);

  const byTypeMap = new Map<string, TypeBreakdown>();
  const dailyMap = new Map<string, DailyPoint>();
  const perWorkerMap = new Map<string, WorkerSummary>();

  let totalHours = 0;
  for (const s of shifts) {
    const h = hoursBetween(s.start, s.end);
    totalHours += h;

    const t = s.type as string;
    const bt = byTypeMap.get(t) ?? {
      type: t,
      label: labels[t] ?? t,
      count: 0,
      hours: 0,
    };
    bt.count += 1;
    bt.hours += h;
    byTypeMap.set(t, bt);

    const key = startOfDay(s.date).toISOString().slice(0, 10);
    const dp = dailyMap.get(key) ?? { date: key, hours: 0, shifts: 0 };
    dp.hours += h;
    dp.shifts += 1;
    dailyMap.set(key, dp);

    const w = perWorkerMap.get(s.userId) ?? {
      userId: s.userId,
      name: s.user.name,
      department: s.user.department,
      hours: 0,
      shifts: 0,
    };
    w.hours += h;
    w.shifts += 1;
    perWorkerMap.set(s.userId, w);
  }

  const daily: DailyPoint[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push(dailyMap.get(key) ?? { date: key, hours: 0, shifts: 0 });
  }

  const perWorker = Array.from(perWorkerMap.values()).sort(
    (a, b) => b.hours - a.hours
  );
  // include workers with no shifts in range
  for (const w of workers) {
    if (!perWorkerMap.has(w.id)) {
      perWorker.push({
        userId: w.id,
        name: w.name,
        department: w.department,
        hours: 0,
        shifts: 0,
      });
    }
  }

  return {
    totalWorkers: workers.length,
    totalShifts: shifts.length,
    totalHours: Math.round(totalHours * 10) / 10,
    activeToday: todayShifts.length,
    pendingConfirmation: pendingConfirmation,
    byType: Array.from(byTypeMap.values()).sort((a, b) => b.hours - a.hours),
    daily,
    perWorker,
  };
}
