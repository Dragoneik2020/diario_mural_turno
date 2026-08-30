import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isMultiBranch, writeBranchId } from "@/lib/session";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["worker", "admin"]).optional(),
  department: z.string().optional(),
  cargo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const defaultPassword: string | undefined = body.defaultPassword;
    const isSuper = isMultiBranch(session);
    const branchId = writeBranchId(session, isSuper ? body.branchId : null);

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
            branchId,
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
