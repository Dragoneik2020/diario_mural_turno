import { prisma } from "./prisma";
import { DEFAULT_SHIFT_TYPE_LABELS, SHIFT_TYPE_KEYS } from "./shiftTypes";

export { DEFAULT_SHIFT_TYPE_LABELS, SHIFT_TYPE_KEYS };

export const DEFAULT_CARGOS: string[] = [
  "Enfermero",
  "Médico",
  "Técnico",
  "Auxiliar",
  "Administrativo",
];

export async function getShiftTypeLabels(): Promise<Record<string, string>> {
  const row = await prisma.setting.findUnique({ where: { key: "shiftTypeLabels" } });
  if (!row) return { ...DEFAULT_SHIFT_TYPE_LABELS };
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_SHIFT_TYPE_LABELS, ...parsed };
  } catch {
    return { ...DEFAULT_SHIFT_TYPE_LABELS };
  }
}

export async function getCargos(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "cargos" } });
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

export async function getEmailNotifications(): Promise<EmailNotifConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "emailNotifications" } });
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
  const row = await prisma.setting.findUnique({ where: { key: "smtp" } });
  if (!row) return { ...DEFAULT_SMTP };
  try {
    const p = JSON.parse(row.value);
    return { ...DEFAULT_SMTP, ...p, port: Number(p.port) || DEFAULT_SMTP.port };
  } catch {
    return { ...DEFAULT_SMTP };
  }
}

export async function getCronSecret(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: "cronSecret" } });
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
