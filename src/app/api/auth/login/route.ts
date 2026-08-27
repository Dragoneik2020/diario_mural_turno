import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifyPassword,
  createToken,
  type Session,
  type AppRole,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const branch = user.branchId
      ? await prisma.branch.findUnique({
          where: { id: user.branchId },
          select: { name: true },
        })
      : null;

    const session: Session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as AppRole,
      department: user.department,
      branchId: user.branchId,
      branchName: branch?.name ?? null,
    };
    const token = await createToken(session);

    const secure = process.env.SESSION_SECURE === "true";

    const res = NextResponse.json({ session });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
