import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, branchWhere } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const workers = await prisma.user.findMany({
      where: { ...branchWhere(session), role: "worker", active: true },
      orderBy: [{ name: "asc" }],
      select: { rut: true, name: true },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Hoja1");

    ws.getCell("B1").value = "ASIGNACIÓN DE TURNOS";
    ws.getCell("B1").font = { bold: true, size: 14 };

    // Encabezados (fila 3)
    const headers = [
      "RUT",
      "Nombre (informativo)",
      "Fecha",
      "Inicio",
      "Fin",
      "Tipo",
      "Nombre del turno",
      "Notas",
    ];
    headers.forEach((h, i) => {
      const cell = ws.getRow(3).getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
    });

    const widths = [14, 26, 14, 10, 10, 12, 20, 30];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = widths[i]));

    // Filas de ejemplo (elemento 0 va a la columna A)
    const rut1 = workers[0]?.rut ?? "17969468-9";
    const name1 = workers[0]?.name ?? "Nombre Apellido";
    const rut2 = workers[1]?.rut ?? "18986334-K";
    const name2 = workers[1]?.name ?? "Nombre Apellido";
    ws.getRow(4).values = [rut1, name1, "01-01-2026", "08:00", "16:00", "mañana", "", ""];
    ws.getRow(5).values = [rut2, name2, "01-01-2026", "20:00", "04:00", "noche", "", ""];
    ws.getRow(6).values = ["", "", "", "", "", "", "", ""];

    // Hoja oculta con el catálogo de trabajadores
    const cat = wb.addWorksheet("Catalogos");
    cat.state = "hidden";
    workers.forEach((w, i) => (cat.getCell(`A${i + 2}`).value = w.rut ?? ""));
    const aLast = Math.max(workers.length, 1);
    const dvRut = `'Catalogos'!$A$2:$A$${aLast + 1}`;

    for (let r = 4; r <= 2000; r++) {
      ws.getCell(`A${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [dvRut] };
      ws.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"manana,tarde,noche,completo,otro"'],
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Planilla_turnos_ejemplo.xlsx"',
      },
    });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al generar plantilla" }, { status: 500 });
  }
}
