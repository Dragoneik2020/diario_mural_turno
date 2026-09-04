import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, companyWhere } from "@/lib/session";
import { getCargos } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const cargos = await getCargos(session.branchId);

    const branches = await prisma.branch.findMany({
      where: { ...companyWhere(session) },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

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
      "Clave de acceso",
    ];
    headers.forEach((h, i) => {
      const cell = ws.getRow(3).getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
    });

    const widths = [14, 16, 16, 16, 14, 26, 20, 18, 16];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = widths[i]));

    // Filas de ejemplo
    const firstBranch = branches[0]?.name ?? "";
    ws.getRow(4).values = [
      "",
      "12345678-9",
      "Lucía",
      "Pérez",
      "Soto",
      "+56 9 1234 5678",
      "lucia@demo.com",
      firstBranch,
      cargos[0] || "",
      "pass123",
    ];
    ws.getRow(5).values = [
      "",
      "98765432-1",
      "Pedro",
      "Sánchez",
      "Muñoz",
      "",
      "pedro@demo.com",
      firstBranch,
      cargos[1] || "",
      "pass123",
    ];
    ws.getRow(6).values = ["", "", "", "", "", "", "", "", "", ""];

    // Hoja oculta con catálogos (sucursales y cargos)
    const cat = wb.addWorksheet("Catalogos");
    cat.state = "hidden";
    branches.forEach((b, i) => (cat.getCell(`A${i + 2}`).value = b.name));
    cargos.forEach((v, i) => (cat.getCell(`B${i + 2}`).value = v));
    const aLast = Math.max(branches.length, 1);
    const bLast = Math.max(cargos.length, 1);
    const dvSuc = `'Catalogos'!$A$2:$A$${aLast + 1}`;
    const dvCargo = `'Catalogos'!$B$2:$B$${bLast + 1}`;

    for (let r = 4; r <= 500; r++) {
      ws.getCell(`G${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvSuc] };
      ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvCargo] };
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
