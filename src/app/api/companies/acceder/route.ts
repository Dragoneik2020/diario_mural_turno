import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requireDios,
  isDios,
  DIOS_COMPANY_COOKIE,
  diosCompanyScope,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// GET: empresa activa (solo informa; sin efecto para roles que no sean dios).
export async function GET() {
  try {
    const session = await requireUser();
    if (!isDios(session))
      return NextResponse.json({ companyId: null, companyName: null });
    const companyId = diosCompanyScope();
    if (!companyId) return NextResponse.json({ companyId: null, companyName: null });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    return NextResponse.json({
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// POST: abrir una empresa (modo empresa para la cuenta DIOS).
export async function POST(req: NextRequest) {
  try {
    await requireDios();
    const body = await req.json().catch(() => ({}));
    const companyId = typeof body?.companyId === "string" ? body.companyId : "";
    if (!companyId)
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company)
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    cookies().set(DIOS_COMPANY_COOKIE, company.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return NextResponse.json({ ok: true, companyId: company.id, companyName: company.name });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// DELETE: salir del modo empresa.
export async function DELETE() {
  try {
    await requireUser();
    cookies().set(DIOS_COMPANY_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}