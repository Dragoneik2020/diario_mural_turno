export const DEFAULT_SHIFT_TYPE_LABELS: Record<string, string> = {
  manana: "MANANA",
  tarde: "TARDE",
  noche: "NOCHE",
  completo: "COMPLETO",
  otro: "OTRO",
};

export const SHIFT_TYPE_KEYS = ["manana", "tarde", "noche", "completo", "otro"];

export interface ShiftTypeSchedule {
  start: string; // HH:mm
  end: string; // HH:mm (puede ser menor que start => turno nocturno, cruza de día)
}

/** Horario por defecto de cada tipo de turno (configurable desde la sección
 *  "Nombre de los tipos de turno" de Ajustes). */
export const DEFAULT_SHIFT_TYPE_SCHEDULES: Record<string, ShiftTypeSchedule> = {
  manana: { start: "08:00", end: "14:00" },
  tarde: { start: "14:00", end: "20:00" },
  noche: { start: "20:00", end: "04:00" },
  completo: { start: "09:00", end: "17:00" },
  otro: { start: "09:00", end: "17:00" },
};