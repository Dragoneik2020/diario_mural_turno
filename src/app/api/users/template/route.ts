import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, companyWhere } from "@/lib/session";
import { getCargos, getDepartamentos } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const branches = await prisma.branch.findMany({
      where: { ...companyWhere(session) },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    // Catálogos de UNA sucursal (sin heredar de otras sucursales/empresas).
    const targetBranchId = session.branchId || branches[0]?.id || null;
    const cargos = await getCargos(targetBranchId);
    const departamentos = await getDepartamentos(targetBranchId);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Hoja1");

    // Título como en la planilla de ejemplo
    ws.getCell("B1").value = "EQUIPO DE TRABAJO";
    ws.getCell("B1").font = { bold: true, size: 14 };

    // Encabezados (fila 3)
    const headers = [
      "RUT",
      "Nombre",
      "Apellido Paterno",
      "Apellido Materno",
      "telefono",
      "correo electronico",
      "Sucursal",
      "Cargo",
      "Departamento",
      "Rol",
      "Clave de acceso",
    ];
    headers.forEach((h, i) => {
      const cell = ws.getRow(3).getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
    });

    const widths = [14, 16, 16, 16, 14, 26, 20, 18, 16, 12, 14];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = widths[i]));

    // Filas de ejemplo (las asignaciones a row.values son 0-indexadas:
    // el elemento 0 va a la columna A).
    const firstBranch = branches[0]?.name ?? "";
    const cargo1 = cargos[0] || "";
    const cargo2 = cargos[1] || cargo1;
    const dep1 = departamentos[0] || "";
    const dep2 = departamentos[1] || dep1;
    ws.getRow(4).values = [
      "17969468-9",
      "Lucía",
      "Pérez",
      "Soto",
      "+56 9 1234 5678",
      "lucia@demo.com",
      firstBranch,
      cargo1,
      dep1,
      "Trabajador",
      "pass123",
    ];
    ws.getRow(5).values = [
      "18986334-K",
      "Pedro",
      "Sánchez",
      "Muñoz",
      "",
      "pedro@demo.com",
      firstBranch,
      cargo2,
      dep2,
      "Trabajador",
      "pass123",
    ];
    ws.getRow(6).values = ["", "", "", "", "", "", "", "", "", "", ""];

    // Hoja oculta con catálogos (sucursales, cargos y departamentos)
    const cat = wb.addWorksheet("Catalogos");
    cat.state = "hidden";
    branches.forEach((b, i) => (cat.getCell(`A${i + 2}`).value = b.name));
    cargos.forEach((v, i) => (cat.getCell(`B${i + 2}`).value = v));
    departamentos.forEach((v, i) => (cat.getCell(`C${i + 2}`).value = v));
    const aLast = Math.max(branches.length, 1);
    const bLast = Math.max(cargos.length, 1);
    const cLast = Math.max(departamentos.length, 1);
    const dvSuc = `'Catalogos'!$A$2:$A$${aLast + 1}`;
    const dvCargo = `'Catalogos'!$B$2:$B$${bLast + 1}`;
    const dvDep = `'Catalogos'!$C$2:$C$${cLast + 1}`;

    for (let r = 4; r <= 500; r++) {
      ws.getCell(`G${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvSuc] };
      ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvCargo] };
      ws.getCell(`I${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvDep] };
      ws.getCell(`J${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Trabajador,Admin"'],
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Planilla_trabajadores_ejemplo.xlsx"',
      },
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al generar plantilla" }, { status: 500 });
  }
}
