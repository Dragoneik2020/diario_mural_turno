import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";
import { nom, txt } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireDios();

    // Usuarios
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, department: true, cargo: true } });
    let usersChanged = 0;
    for (const u of users) {
      const data: Record<string, unknown> = {};
      const name = nom(u.name);
      const email = nom(u.email);
      const department = u.department ? nom(u.department) : null;
      const cargo = u.cargo ? nom(u.cargo) : null;
      if (name && u.name !== name) data.name = name;
      if (email && u.email !== email) data.email = email;
      if ((u.department ?? null) !== department) data.department = department;
      if ((u.cargo ?? null) !== cargo) data.cargo = cargo;
      if (Object.keys(data).length > 0) {
        await prisma.user.update({ where: { id: u.id }, data });
        usersChanged++;
      }
    }

    // Empresas
    const companies = await prisma.company.findMany({ select: { id: true, name: true } });
    let companiesChanged = 0;
    for (const c of companies) {
      const name = nom(c.name);
      if (name && c.name !== name) {
        await prisma.company.update({ where: { id: c.id }, data: { name } });
        companiesChanged++;
      }
    }

    // Sucursales
    const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    let branchesChanged = 0;
    for (const b of branches) {
      const name = nom(b.name);
      if (name && b.name !== name) {
        await prisma.branch.update({ where: { id: b.id }, data: { name } });
        branchesChanged++;
      }
    }

    // Turnos: nombre y notas (conservando saltos de línea)
    const shifts = await prisma.shift.findMany({ select: { id: true, name: true, notes: true } });
    let shiftsChanged = 0;
    for (const s of shifts) {
      const data: Record<string, unknown> = {};
      if (s.name !== null) {
        const n = nom(s.name);
        if (n && s.name !== n) data.name = n;
      }
      if (s.notes !== null) {
        const no = txt(s.notes);
        if (no && s.notes !== no) data.notes = no;
      }
      if (Object.keys(data).length > 0) {
        await prisma.shift.update({ where: { id: s.id }, data });
        shiftsChanged++;
      }
    }

    // Listas de departamentos, cargos y etiquetas de tipos en ajustes
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["departamentos", "cargos", "shiftTypeLabels"] } },
      select: { branchId: true, key: true, value: true },
    });
    let settingsChanged = 0;
    for (const s of settings) {
      try {
        const value = JSON.parse(s.value);
        if (Array.isArray(value)) {
          const norm = [...new Set(value.map((v: unknown) => nom(String(v))).filter((v: string) => v.length > 0))];
          if (JSON.stringify(value) !== JSON.stringify(norm)) {
            await prisma.setting.update({
              where: { branchId_key: { branchId: s.branchId, key: s.key } },
              data: { value: JSON.stringify(norm) },
            });
            settingsChanged++;
          }
        } else if (s.key === "shiftTypeLabels" && typeof value === "object" && value !== null) {
          const norm = Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, nom(String(v))])
          );
          if (JSON.stringify(value) !== JSON.stringify(norm)) {
            await prisma.setting.update({
              where: { branchId_key: { branchId: s.branchId, key: s.key } },
              data: { value: JSON.stringify(norm) },
            });
            settingsChanged++;
          }
        }
      } catch {
        /* valor no JSON: se ignora */
      }
    }

    return NextResponse.json({
      ok: true,
      usersChanged,
      companiesChanged,
      branchesChanged,
      shiftsChanged,
      settingsChanged,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al normalizar" }, { status: 500 });
  }
}