import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canManageRole, branchWhere, isMultiBranch } from "@/lib/session";
import { notifyShiftById } from "@/lib/email";
import { normalizeRut } from "@/lib/rut";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  rut: z.string().optional().nullable(),
  userId: z.string().optional(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  type: z.string().optional(),
  name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

const TYPE_ALIASES: Record<string, string> = {
  manana: "manana",
  morning: "manana",
  tarde: "tarde",
  afternoon: "tarde",
  noche: "noche",
  night: "noche",
  completo: "completo",
  full: "completo",
  otro: "otro",
  other: "otro",
};

function stripAccents(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Acepta AAAA-MM-DD o DD-MM-AAAA (también con "/"). */
function parseDateStr(raw: string): string | null {
  const v = (raw || "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) {
    const [, y, mo, d] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(v);
  if (m) {
    const [, d, mo, y] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Acepta HH:mm, H:mm, HH:mm:ss o "HHhmm". */
function parseTimeStr(raw: string): string | null {
  const m = /^(\d{1,2})\s*[:.hH]\s*(\d{1,2})/.exec((raw || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function combine(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!canManageRole(session.role))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const defaultType: string = TYPE_ALIASES[stripAccents(String(body.defaultType || ""))] || "completo";
    const isSuper = isMultiBranch(session);

    const created: { rut: string; name: string; date: string }[] = [];
    const errors: { rut: string; error: string }[] = [];
    const createdIds: string[] = [];

    for (const raw of items) {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push({ rut: raw?.rut || "—", error: "Datos inválidos" });
        continue;
      }
      const data = parsed.data;
      const rutRaw = data.rut?.trim() || "";
      const rutNorm = rutRaw ? normalizeRut(rutRaw) : null;

      const dateStr = parseDateStr(data.date);
      const startStr = parseTimeStr(data.start);
      const endStr = parseTimeStr(data.end);

      if (!rutNorm && !data.userId) {
        errors.push({ rut: rutRaw || "—", error: "Falta RUT del trabajador" });
        continue;
      }
      if (!dateStr) {
        errors.push({ rut: rutRaw || "—", error: "Fecha inválida (usa DD-MM-AAAA o AAAA-MM-DD)" });
        continue;
      }
      if (!startStr || !endStr) {
        errors.push({ rut: rutRaw || "—", error: "Horario inválido (usa HH:mm)" });
        continue;
      }

      // Trabajador: por userId (si viene) o por RUT, siempre dentro del
      // alcance del administrador (sin cruzar sucursales/empresas).
      const target = data.userId
        ? await prisma.user.findFirst({
            where: { id: data.userId, ...branchWhere(session) },
            select: { id: true, name: true, rut: true, branchId: true },
          })
        : await prisma.user.findFirst({
            where: { rut: rutNorm, ...branchWhere(session) },
            select: { id: true, name: true, rut: true, branchId: true },
          });
      if (!target) {
        errors.push({ rut: rutRaw || "—", error: "Trabajador no encontrado en tu alcance" });
        continue;
      }

      const start = combine(dateStr, startStr);
      let end = combine(dateStr, endStr);
      // Turno nocturno: si el fin es menor o igual al inicio, cruza la medianoche.
      if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

      const type = data.type ? TYPE_ALIASES[stripAccents(data.type)] || defaultType : defaultType;
      const status = data.status?.trim() === "confirmado" ? "confirmado" : "asignado";

      // Evita duplicados exactos (mismo trabajador con el mismo inicio).
      const dup = await prisma.shift.findFirst({
        where: { userId: target.id, start },
        select: { id: true },
      });
      if (dup) {
        errors.push({ rut: rutRaw || "—", error: "Ya existe un turno con esa fecha y hora" });
        continue;
      }

      try {
        const shift = await prisma.shift.create({
          data: {
            userId: target.id,
            branchId: target.branchId ?? null,
            date: start,
            start,
            end,
            type,
            name: data.name?.trim() || null,
            notes: data.notes?.trim() || null,
            status,
          },
          select: { id: true },
        });
        createdIds.push(shift.id);
        created.push({ rut: target.rut ?? rutRaw, name: target.name, date: dateStr });
      } catch {
        errors.push({ rut: rutRaw || "—", error: "Error al crear turno" });
      }
    }

    // Notificaciones (email + Telegram + push) en secuencia, best effort.
    if (createdIds.length > 0) {
      void (async () => {
        for (const id of createdIds) {
          try {
            await notifyShiftById(id);
          } catch {
            /* notificación opcional */
          }
        }
      })();
    }

    return NextResponse.json({
      created: created.length,
      createdRows: created,
      errors,
      skipped: isSuper ? undefined : 0,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al importar turnos" }, { status: 500 });
  }
}
