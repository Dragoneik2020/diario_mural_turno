import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, branchWhere } from "@/lib/session";
import { getCargos } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const cargos = await getCargos(session.branchId);
    const users = await prisma.user.findMany({
      where: { ...branchWhere(session) },
      select: { department: true },
    });
    const deptos = Array.from(new Set(users.map((u) => u.department).filter((d): d is string => !!d)));

    const rolList = ["worker", "admin"];
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Trabajadores");
    ws.columns = [
      { header: "Nombre", key: "nombre", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Departamento", key: "depto", width: 20 },
      { header: "Cargo", key: "cargo", width: 18 },
      { header: "Contraseña", key: "pass", width: 16 },
      { header: "Rol", key: "rol", width: 12 },
    ];
    ws.addRow({
      nombre: "Lucía Pérez",
      email: "lucia@demo.com",
      depto: deptos[0] || "",
      cargo: cargos[0] || "",
      pass: "pass123",
      rol: "worker",
    });
    ws.addRow({
      nombre: "Pedro Sánchez",
      email: "pedro@demo.com",
      depto: deptos[1] || "",
      cargo: cargos[1] || "",
      pass: "pass123",
      rol: "worker",
    });
    ws.addRow({ nombre: "Sara Gómez", email: "sara@demo.com", depto: "", cargo: "", pass: "", rol: "worker" });
    ws.getRow(1).font = { bold: true };

    const cat = wb.addWorksheet("Catalogos");
    cat.state = "hidden";
    cargos.forEach((v, i) => (cat.getCell(`A${i + 2}`).value = v));
    deptos.forEach((v, i) => (cat.getCell(`B${i + 2}`).value = v));
    rolList.forEach((v, i) => (cat.getCell(`C${i + 2}`).value = v));
    const aLast = Math.max(cargos.length, 1);
    const bLast = Math.max(deptos.length, 1);
    const cLast = rolList.length;
    const dvCargo = `'Catalogos'!$A$2:$A$${aLast + 1}`;
    const dvDepto = `'Catalogos'!$B$2:$B$${bLast + 1}`;
    const dvRol = `'Catalogos'!$C$2:$C$${cLast + 1}`;

    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`C${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvDepto] };
      ws.getCell(`D${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvCargo] };
      ws.getCell(`F${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvRol] };
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="ejemplo_trabajadores.xlsx"',
      },
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al generar plantilla" }, { status: 500 });
  }
}
