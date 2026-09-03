import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isMultiBranch, writeBranchId, isDios } from "@/lib/session";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
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
    const errors: { email: string; error: string }[] = [];

    for (const raw of items) {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push({ email: raw?.email || "—", error: "Datos inválidos" });
        continue;
      }
      const { name, email, role, department, cargo } = parsed.data;

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

      const password = parsed.data.password || defaultPassword;
      if (!password) {
        errors.push({ email, error: "Sin contraseña (falta en fila y sin default)" });
        continue;
      }
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        errors.push({ email, error: "El email ya está registrado" });
        continue;
      }
      try {
        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hash,
            role: role ?? "worker",
            department: department || null,
            cargo: cargo || null,
            active: true,
            branchId: rowBranchId,
            companyId: rowCompanyId,
          },
          select: { id: true, name: true, email: true },
        });
        created.push({ email: user.email, name: user.name });
      } catch (e: any) {
        errors.push({ email, error: "Error al crear" });
      }
    }

    return NextResponse.json({ created: created.length, createdRows: created, errors });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al importar" }, { status: 500 });
  }
}
