import { prisma } from "./prisma";
import { fmtDate, fmtTime } from "./format";
import { getShiftTypeLabels } from "./settings";

export const GLOBAL_BRANCH_ID = "global";

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  messageTemplate: string;
  morningTemplate: string;
}

export const DEFAULT_TELEGRAM: TelegramConfig = {
  enabled: false,
  botToken: "",
  messageTemplate:
    "Hola {nombre}.\n\nSe te ha asignado un turno:\n• Tipo: {tipo}\n• Fecha: {fecha}\n• Horario: {inicio}–{fin}",
  morningTemplate:
    "Hola {nombre}.\n\nRecordatorio de tu turno de hoy:\n• Tipo: {tipo}\n• Horario: {inicio}–{fin}",
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "telegram" } },
  });
  if (!row) return { ...DEFAULT_TELEGRAM };
  try {
    const p = JSON.parse(row.value);
    return {
      ...DEFAULT_TELEGRAM,
      ...p,
      enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_TELEGRAM.enabled,
    };
  } catch {
    return { ...DEFAULT_TELEGRAM };
  }
}

interface WorkerLite {
  name: string;
  telegramChatId?: string | null;
}

interface ShiftLite {
  type: string;
  date: Date | string;
  start: Date | string;
  end: Date | string;
  name?: string | null;
}

type Template = "assignment" | "morning";

function fillTemplate(tpl: string, worker: WorkerLite, shift: ShiftLite, typeLabel: string): string {
  const map: Record<string, string> = {
    "{nombre}": worker.name,
    "{tipo}": typeLabel,
    "{fecha}": fmtDate(new Date(shift.date)),
    "{inicio}": fmtTime(new Date(shift.start)),
    "{fin}": fmtTime(new Date(shift.end)),
    "{turno}": shift.name || "",
  };
  return tpl.replace(/\{[a-z]+\}/gi, (m) => (m in map ? map[m] : m));
}

export async function sendTelegram(
  chatId: string,
  text: string,
  botToken: string
): Promise<boolean> {
  if (!chatId || !text || !botToken) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[telegram] Error enviando:", res.status, body);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn("[telegram] Error enviando:", e?.message || e);
    return false;
  }
}

export async function notifyTelegramShift(
  worker: WorkerLite,
  shift: ShiftLite,
  typeLabel: string,
  branchId?: string | null,
  template: Template = "assignment"
): Promise<boolean> {
  if (!worker.telegramChatId) return false;
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.botToken) return false;

  const tpl =
    template === "morning" && cfg.morningTemplate?.trim()
      ? cfg.morningTemplate
      : cfg.messageTemplate;
  const text = fillTemplate(tpl, worker, shift, typeLabel);
  return sendTelegram(worker.telegramChatId, text, cfg.botToken);
}
