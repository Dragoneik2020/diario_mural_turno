import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeRut, RUT_FORMAT_ERROR } from "@/lib/rut";
import { requireAdmin, isMultiBranch, writeBranchId, isDios } from "@/lib/session";
import { notifyAccountCreated } from "@/lib/email";
import { nom } from "@/lib/normalize";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  rut: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
  branchId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const defaultPassword: string | undefined = body.defaultPassword;
    const isDiosUser = isDios(session);
    const isSuper = isMultiBranch(session);
    const branchId = writeBranchId(session, isSuper ? body.branchId : null);
    const globalCompanyId = isDiosUser ? body.companyId : null;

    if (branchId && session.role === "superadmin") {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, companyId: session.companyId ?? "__NONE__" },
      });
      if (!branch)
        return NextResponse.json({ error: "Sucursal fuera de tu empresa" }, { status: 403 });
    }

    const created: { email: string; name: string }[] = [];
    const updated: { email: string; name: string; savedRut: string }[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const raw of items) {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push({ email: raw?.email || "—", error: "Datos inválidos" });
        continue;
      }
      const { name, email, role } = parsed.data;
      // Todo texto se guarda en MAYÚSCULAS y sin acentos.
      const nameNorm = nom(name);
      const emailNorm = nom(email);
      const department = parsed.data.department ? nom(parsed.data.department) : null;
      const cargo = parsed.data.cargo ? nom(parsed.data.cargo) : null;
      const rutRaw = parsed.data.rut?.trim() || null;
      if (rutRaw && !normalizeRut(rutRaw)) {
        errors.push({ email, error: RUT_FORMAT_ERROR });
        continue;
      }
      const rutNorm = rutRaw ? (normalizeRut(rutRaw) as string) : null;

      // Sucursal efectiva de la fila: la del archivo, o la global elegida.
      let rowBranchId = branchId;
      let rowCompanyId: string | null = globalCompanyId || null;
      if (isDiosUser && parsed.data.companyId) {
        rowCompanyId = parsed.data.companyId;
      }
      if (isSuper && parsed.data.branchId && parsed.data.branchId !== branchId) {
        if (session.role === "superadmin") {
          const b = await prisma.branch.findFirst({
            where: { id: parsed.data.branchId, companyId: session.companyId ?? "__NONE__" },
          });
          if (!b) {
            errors.push({ email, error: "Sucursal fuera de tu empresa" });
            continue;
          }
        }
        rowBranchId = parsed.data.branchId;
      }
      // Validar sucursal contra companyId si ambos están presentes
      if (rowBranchId && rowCompanyId && isDiosUser) {
        const b = await prisma.branch.findFirst({
          where: { id: rowBranchId, companyId: rowCompanyId },
        });
        if (!b) {
          errors.push({ email, error: "La sucursal no pertenece a la empresa seleccionada" });
          continue;
        }
        // La sucursal coincide con la empresa, así que companyId ya está bien
      }
      // Derivar companyId de la sucursal si no se proveyó
      if (!rowCompanyId && rowBranchId) {
        const b = await prisma.branch.findUnique({ where: { id: rowBranchId } });
        rowCompanyId = b?.companyId ?? null;
      }

      // El RUT es la clave de la cuenta en la app: si la fila trae un RUT
      // ya registrado, esa es la cuenta a actualizar (aunque el email difiera);
      // si no, se usa el email para ubicar la cuenta y asignarle el RUT.
      const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
      let target:
        | { id: string; email: string; rut: string | null; branchId: string | null; companyId: string | null; department: string | null; cargo: string | null }
        | null = null;
      if (rutNorm) {
        target = await prisma.user.findUnique({ where: { rut: rutNorm } });
      }
      if (!target) target = exists;

      if (target) {
        const changes: Record<string, unknown> = {};
        if (rutNorm && target.rut !== rutNorm) changes.rut = rutNorm;
        if (cargo && target.cargo !== cargo) changes.cargo = cargo;
        if (department && target.department !== department) changes.department = department;
        const effBranchId = rowBranchId;
        if (effBranchId && target.branchId !== effBranchId) changes.branchId = effBranchId;
        if (rowCompanyId && target.companyId !== rowCompanyId) changes.companyId = rowCompanyId;
        if (target.email !== emailNorm) {
          const emailOwner = await prisma.user.findUnique({ where: { email: emailNorm } });
          if (emailOwner && emailOwner.id !== target.id) {
            errors.push({ email, error: "El email ya está registrado por otra cuenta" });
            continue;
          }
          changes.email = emailNorm;
        }

        if (Object.keys(changes).length > 0) {
          try {
            const upd = await prisma.user.update({
              where: { id: target.id },
              data: changes,
              select: { id: true, name: true, email: true },
            });
            updated.push({
              email: upd.email,
              name: upd.name,
              savedRut: (rutNorm ?? target.rut ?? "") as string,
            });
          } catch {
            errors.push({ email, error: "Error al actualizar" });
          }
        }
        continue;
      }

      const password = parsed.data.password || defaultPassword;
      if (!password) {
        errors.push({ email, error: "Sin contraseña (falta en fila y sin default)" });
        continue;
      }
      if (rutNorm) {
        const rutExists = await prisma.user.findUnique({ where: { rut: rutNorm } });
        if (rutExists) {
          errors.push({ email, error: "El RUT ya está registrado" });
          continue;
        }
      }
      try {
        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: {
            name: nameNorm,
            email: emailNorm,
            rut: rutNorm,
            password: hash,
            role: role ?? "worker",
            department,
            cargo,
            active: true,
            branchId: rowBranchId,
            companyId: rowCompanyId,
          },
          select: { id: true, name: true, email: true },
        });
        created.push({ email: user.email, name: user.name });
        // Notifica al trabajador (fire-and-forget; best effort).
        notifyAccountCreated(
          { name: user.name, email: user.email },
          { rut: rutNorm ?? "", password },
          `${req.nextUrl.origin}/login`,
          rowBranchId
        );
      } catch (e: any) {
        errors.push({ email, error: "Error al crear" });
      }
    }

    return NextResponse.json({
      created: created.length,
      createdRows: created,
      updated: updated.length,
      updatedRows: updated,
      errors,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al importar" }, { status: 500 });
  }
}
