import { prisma } from "./prisma";
import { DEFAULT_SHIFT_TYPE_LABELS, SHIFT_TYPE_KEYS } from "./shiftTypes";

export { DEFAULT_SHIFT_TYPE_LABELS, SHIFT_TYPE_KEYS };

/** Sucursal ficticia donde viven los ajustes compartidos por toda la app (SMTP, cron, defaults). */
export const GLOBAL_BRANCH_ID = "global";

export const DEFAULT_CARGOS: string[] = [
  "Enfermero",
  "Médico",
  "Técnico",
  "Auxiliar",
  "Administrativo",
];

export const DEFAULT_DEPARTAMENTOS: string[] = [
  "Medicina",
  "Urgencias",
  "Pabellón",
  "UCI",
  "Pediatría",
];

async function getSetting(key: string, branchId?: string | null) {
  const b = branchId || GLOBAL_BRANCH_ID;
  const rows = await prisma.setting.findMany({
    where: { key, branchId: { in: [GLOBAL_BRANCH_ID, b] } },
  });
  return (
    rows.find((r) => r.branchId === b) ??
    rows.find((r) => r.branchId === GLOBAL_BRANCH_ID) ??
    null
  );
}

export async function getShiftTypeLabels(
  branchId?: string | null
): Promise<Record<string, string>> {
  const row = await getSetting("shiftTypeLabels", branchId);
  if (!row) return { ...DEFAULT_SHIFT_TYPE_LABELS };
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_SHIFT_TYPE_LABELS, ...parsed };
  } catch {
    return { ...DEFAULT_SHIFT_TYPE_LABELS };
  }
}

export async function getCargos(branchId?: string | null): Promise<string[]> {
  const row = await getSetting("cargos", branchId);
  if (!row) return [...DEFAULT_CARGOS];
  try {
    const parsed = JSON.parse(row.value);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
    return [...DEFAULT_CARGOS];
  } catch {
    return [...DEFAULT_CARGOS];
  }
}

export async function getDepartamentos(branchId?: string | null): Promise<string[]> {
  const row = await getSetting("departamentos", branchId);
  if (!row) return [...DEFAULT_DEPARTAMENTOS];
  try {
    const parsed = JSON.parse(row.value);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
    return [...DEFAULT_DEPARTAMENTOS];
  } catch {
    return [...DEFAULT_DEPARTAMENTOS];
  }
}

export interface EmailNotifConfig {
  enabled: boolean;
  subject: string;
  body: string;
  morningEnabled: boolean;
  morningSubject: string;
  morningBody: string;
}

export const DEFAULT_EMAIL_NOTIF: EmailNotifConfig = {
  enabled: false,
  subject: "Te han asignado un turno",
  body:
    "Hola {nombre}.\n\nSe te ha asignado un turno:\n• Tipo: {tipo}\n• Fecha: {fecha}\n• Horario: {inicio}–{fin}",
  morningEnabled: false,
  morningSubject: "Recordatorio: tienes turno hoy",
  morningBody:
    "Hola {nombre}.\n\nRecordatorio de tu turno de hoy:\n• Tipo: {tipo}\n• Horario: {inicio}–{fin}",
};

export async function getEmailNotifications(
  branchId?: string | null
): Promise<EmailNotifConfig> {
  const row = await getSetting("emailNotifications", branchId);
  if (!row) return { ...DEFAULT_EMAIL_NOTIF };
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_EMAIL_NOTIF, ...parsed };
  } catch {
    return { ...DEFAULT_EMAIL_NOTIF };
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export const DEFAULT_SMTP: SmtpConfig = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  from: "",
};

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "smtp" } },
  });
  if (!row) return { ...DEFAULT_SMTP };
  try {
    const p = JSON.parse(row.value);
    return { ...DEFAULT_SMTP, ...p, port: Number(p.port) || DEFAULT_SMTP.port };
  } catch {
    return { ...DEFAULT_SMTP };
  }
}

export async function getCronSecret(): Promise<string> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "cronSecret" } },
  });
  if (row) {
    try {
      const v = JSON.parse(row.value);
      if (typeof v === "string" && v) return v;
    } catch {
      /* ignore */
    }
  }
  return process.env.CRON_SECRET || "";
}