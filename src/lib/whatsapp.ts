import { prisma } from "./prisma";

export const GLOBAL_BRANCH_ID = "global";

export interface WhatsAppConfig {
  enabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  senderPhone: string;
  webhookSecret: string;
  messageTemplate: string;
}

export const DEFAULT_WHATSAPP: WhatsAppConfig = {
  enabled: false,
  accessToken: "",
  phoneNumberId: "",
  senderPhone: "",
  webhookSecret: "",
  messageTemplate:
    "Hola {nombre}.\n\nSe te ha asignado un turno:\n• Tipo: {tipo}\n• Fecha: {fecha}\n• Horario: {inicio}–{fin}",
};

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "whatsapp" } },
  });
  if (!row) return { ...DEFAULT_WHATSAPP };
  try {
    const p = JSON.parse(row.value);
    return {
      ...DEFAULT_WHATSAPP,
      ...p,
      enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_WHATSAPP.enabled,
    };
  } catch {
    return { ...DEFAULT_WHATSAPP };
  }
}