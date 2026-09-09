import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nom, nomEq } from "../src/lib/normalize";

const prisma = new PrismaClient();
const GLOBAL = "global";
const SEED_DEMO = process.env.SEED_DEMO === "true";
const RINCONZ_COMPANY_ID = "company-rincon-z";

const DEFAULT_PLANS = [
  {
    code: "basico",
    name: nom("Básico"),
    description: nom("Para una sucursal que recién organiza sus turnos."),
    priceMensual: 19990,
    priceAnual: 199900,
    maxBranches: 1,
    maxWorkers: 30,
    features: JSON.stringify(
      ["1 sucursal", "Hasta 30 trabajadores", "Calendario de turnos", "Mural de avisos", "Encuestas y votaciones"].map(nom)
    ),
  },
  {
    code: "pro",
    name: nom("Pro"),
    description: nom("Para equipos que crecen y necesitan varias sucursales."),
    priceMensual: 39990,
    priceAnual: 399900,
    maxBranches: 5,
    maxWorkers: 150,
    features: JSON.stringify(
      ["Hasta 5 sucursales", "Hasta 150 trabajadores", "Todo lo del Básico", "Filtro por cargo y departamento", "Exportación a Excel", "Notificaciones por correo y push"].map(nom)
    ),
  },
  {
    code: "empresa",
    name: nom("Empresa"),
    description: nom("Para organizaciones grandes con muchas sucursales."),
    priceMensual: 79990,
    priceAnual: 799900,
    maxBranches: 9999,
    maxWorkers: 99999,
    features: JSON.stringify(
      ["Sucursales y trabajadores ilimitados", "Todo lo del Pro", "Roles y permisos avanzados", "Soporte prioritario", "Notificaciones por correo y push"].map(nom)
    ),
  },
];

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const workerPassword = await bcrypt.hash("trabajador123", 10);

  const central = await prisma.branch.upsert({
    where: { id: "branch-central" },
    update: { name: nom("Sucursal Central") },
    create: { id: "branch-central", name: nom("Sucursal Central") },
  });

  const norte = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: { name: nom("Sucursal Norte") },
    create: { id: "branch-norte", name: nom("Sucursal Norte") },
  });

  const dios = await prisma.user.upsert({
    where: { rut: "12345678-5" },
    update: { role: "dios", branchId: null, name: nom("Cuenta DIOS"), email: nom("admin@demo.com") },
    create: {
      name: nom("Cuenta DIOS"),
      email: nom("admin@demo.com"),
      rut: "12345678-5",
      password: adminPassword,
      role: "dios",
      department: nom("Dirección"),
    },
  });

  const superRincon = await prisma.user.upsert({
    where: { rut: "66666666-6" },
    update: { role: "superadmin", branchId: central.id, name: nom("Super Admin Rincon-Z"), email: nom("super@demo.com") },
    create: {
      name: nom("Super Admin Rincon-Z"),
      email: nom("super@demo.com"),
      rut: "66666666-6",
      password: adminPassword,
      role: "superadmin",
      department: nom("Dirección"),
      branchId: central.id,
    },
  });

  const adminCentral = await prisma.user.upsert({
    where: { rut: "55555555-5" },
    update: { role: "admin", branchId: central.id, name: nom("Admin Central"), email: nom("central@demo.com") },
    create: {
      name: nom("Admin Central"),
      email: nom("central@demo.com"),
      rut: "55555555-5",
      password: adminPassword,
      role: "admin",
      department: nom("Dirección"),
      branchId: central.id,
    },
  });

  const adminNorte = await prisma.user.upsert({
    where: { rut: "44444444-4" },
    update: { role: "admin", branchId: norte.id, name: nom("Admin Norte"), email: nom("norte@demo.com") },
    create: {
      name: nom("Admin Norte"),
      email: nom("norte@demo.com"),
      rut: "44444444-4",
      password: adminPassword,
      role: "admin",
      department: nom("Dirección"),
      branchId: norte.id,
    },
  });

  const workers = [
    { name: nom("Ana López"), email: nom("ana@demo.com"), rut: "11111111-1", department: nom("Ventas"), cargo: nom("Vendedor"), branchId: central.id },
    { name: nom("Carlos Ruiz"), email: nom("carlos@demo.com"), rut: "22222222-2", department: nom("Almacén"), cargo: nom("Técnico"), branchId: central.id },
    { name: nom("María Gómez"), email: nom("maria@demo.com"), rut: "33333333-3", department: nom("Atención al cliente"), cargo: nom("Auxiliar"), branchId: central.id },
    { name: nom("Javier Martín"), email: nom("javier@demo.com"), rut: "77777777-7", department: nom("Ventas"), cargo: nom("Vendedor"), branchId: central.id },
    { name: nom("Lucía Pérez"), email: nom("lucia@demo.com"), rut: "88888888-8", department: nom("Atención al cliente"), cargo: nom("Auxiliar"), branchId: norte.id },
    { name: nom("Pedro Sánchez"), email: nom("pedro@demo.com"), rut: "99999999-9", department: nom("Almacén"), cargo: nom("Técnico"), branchId: norte.id },
  ];

  const announcementExamples = [
    {
      content: nom(
        "📢 Recordatorio: la nueva rotación de turnos entra en vigor el lunes. Revisad el calendario y avisad si hay conflictos."
      ),
      pinned: true,
    },
    {
      content: nom("☕ La máquina de café del almacén está arreglada. ¡Gracias por vuestra paciencia!"),
      pinned: false,
    },
  ];

  const pollExamples = [
    {
      question: nom("¿Qué día preferís para la próxima formación de seguridad?"),
      options: ["Lunes", "Miércoles", "Viernes"].map(nom),
    },
    {
      question: nom("¿Estáis de acuerdo con ampliar el descanso a 30 minutos?"),
      options: ["Sí, totalmente", "No, está bien así"].map(nom),
    },
  ];

  if (SEED_DEMO) {
    for (const w of workers) {
      await prisma.user.upsert({
        where: { rut: w.rut },
        update: { role: "worker", branchId: w.branchId, name: w.name, email: w.email, department: w.department, cargo: w.cargo },
        create: {
          name: w.name,
          email: w.email,
          rut: w.rut,
          password: workerPassword,
          role: "worker",
          department: w.department,
          cargo: w.cargo,
          branchId: w.branchId,
        },
      });
    }

    // Turnos de ejemplo solo si no hay turnos recientes (evita acumular en cada deploy).
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const recent = await prisma.shift.count({ where: { date: { gte: weekAgo } } });

    if (recent === 0) {
      const allWorkers = await prisma.user.findMany({ where: { role: "worker" } });
      const types = ["manana", "tarde", "noche", "completo"] as const;

      for (const worker of allWorkers) {
        for (let d = 6; d >= 0; d--) {
          const day = new Date(now);
          day.setDate(now.getDate() - d);
          const type = types[(d + worker.name.length) % types.length];
          const startHour = type === "manana" ? 8 : type === "tarde" ? 14 : type === "noche" ? 22 : 9;
          const duration = type === "completo" ? 8 : type === "noche" ? 8 : 6;

          const start = new Date(day);
          start.setHours(startHour, 0, 0, 0);
          const end = new Date(start);
          end.setHours(startHour + duration, 0, 0, 0);

          await prisma.shift.create({
            data: {
              userId: worker.id,
              branchId: worker.branchId ?? null,
              date: start,
              start,
              end,
              type,
              notes: d === 0 ? "Turno de ejemplo" : undefined,
            },
          });
        }
      }
    }

    const existingAnns = await prisma.announcement.count();
    if (existingAnns === 0) {
      for (const a of announcementExamples) {
        await prisma.announcement.create({
          data: {
            authorId: adminCentral.id,
            branchId: central.id,
            content: a.content,
            pinned: a.pinned,
          },
        });
      }
    }

    const existingPolls = await prisma.poll.count();
    if (existingPolls === 0) {
      for (const p of pollExamples) {
        await prisma.poll.create({
          data: {
            authorId: adminCentral.id,
            branchId: central.id,
            question: p.question,
            options: {
              create: p.options.map((label, i) => ({ label, order: i })),
            },
          },
        });
      }
    }
  }

  // Backfill: los usuarios legacy (sin sucursal) quedan en la Central.
  await prisma.user.updateMany({
    where: { branchId: null, role: { notIn: ["superadmin", "dios"] } },
    data: { branchId: central.id },
  });

  // Asigna el RUT 17.969.468-9 a la cuenta DIOS real (juannretamal@hotmail.com) si existe.
  const diosReal = (await prisma.user.findMany({ select: { id: true, email: true } })).find((u) =>
    nomEq(u.email, "juannretamal@hotmail.com")
  );
  if (diosReal) {
    const rutUsed = await prisma.user.findUnique({ where: { rut: "17969468-9" } });
    if (!rutUsed || rutUsed.id === diosReal.id) {
      await prisma.user.update({
        where: { id: diosReal.id },
        data: { rut: "17969468-9", role: "dios" },
      });
    }
  }

  // Backfill: turnos legacy heredan la sucursal de su trabajador.
  const legacyShifts = await prisma.shift.findMany({
    where: { branchId: null },
    select: { id: true, user: { select: { branchId: true } } },
  });
  for (const s of legacyShifts) {
    if (s.user.branchId) {
      await prisma.shift.update({ where: { id: s.id }, data: { branchId: s.user.branchId } });
    }
  }

  await prisma.announcement.updateMany({
    where: { branchId: null },
    data: { branchId: central.id },
  });
  await prisma.poll.updateMany({
    where: { branchId: null },
    data: { branchId: central.id },
  });

  // Planes por defecto (upsert idempotente).
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { ...p },
      create: { ...p },
    });
  }

  // Empresa demo "Rincon-Z" dueña de las sucursales existentes.
  const empresaPlan = await prisma.plan.findUnique({ where: { code: "empresa" } });
  await prisma.company.upsert({
    where: { id: RINCONZ_COMPANY_ID },
    update: { name: nom("Rincon-Z"), status: "activa", planId: empresaPlan?.id ?? null },
    create: {
      id: RINCONZ_COMPANY_ID,
      name: nom("Rincon-Z"),
      slug: "rincon-z",
      status: "activa",
      planId: empresaPlan?.id ?? null,
    },
  });

  // Backfill: las sucursales legacy quedan bajo la empresa demo.
  await prisma.branch.updateMany({
    where: { companyId: null },
    data: { companyId: RINCONZ_COMPANY_ID },
  });

  // Backfill: los trabajadores adoptan la empresa de su sucursal (migra cuentas legacy a empresa).
  const usersToCompany = await prisma.user.findMany({
    where: { branchId: { not: null }, companyId: null },
    select: { id: true, branchId: true },
  });
  for (const u of usersToCompany) {
    const branch = await prisma.branch.findUnique({ where: { id: u.branchId! } });
    if (branch?.companyId) {
      await prisma.user.update({ where: { id: u.id }, data: { companyId: branch.companyId } });
    }
  }

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "shiftTypeLabels" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "shiftTypeLabels",
      value: JSON.stringify({
        manana: "MANANA",
        tarde: "TARDE",
        noche: "NOCHE",
        completo: "COMPLETO",
        otro: "OTRO",
      }),
    },
  });

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "cargos" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "cargos",
      value: JSON.stringify(["Enfermero", "Médico", "Técnico", "Auxiliar", "Administrativo"].map(nom)),
    },
  });

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "emailNotifications" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "emailNotifications",
      value: JSON.stringify({
        enabled: false,
        subject: "Te han asignado un turno",
        body:
          "Hola {nombre}.\n\nSe te ha asignado un turno:\n• Tipo: {tipo}\n• Fecha: {fecha}\n• Horario: {inicio}–{fin}",
        morningEnabled: false,
        morningSubject: "Recordatorio: tienes turno hoy",
        morningBody:
          "Hola {nombre}.\n\nRecordatorio de tu turno de hoy:\n• Tipo: {tipo}\n• Horario: {inicio}–{fin}",
      }),
    },
  });

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "smtp" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "smtp",
      value: JSON.stringify({
        host: "mailu.rincon-z.cl",
        port: 587,
        secure: false,
        user: "admin@rincon-z.cl",
        pass: "t6m01a8wzkjaqeposvofsdayuetl1spy",
        from: "Diario Mural de Turnos <admin@rincon-z.cl>",
      }),
    },
  });

  console.log("Seed completado.");
  console.log("Cuenta DIOS: ADMIN@DEMO.COM / admin123");
  console.log("Super Admin (empresa): SUPER@DEMO.COM / admin123");
  console.log("Admin Central: CENTRAL@DEMO.COM / admin123");
  console.log("Admin Norte: NORTE@DEMO.COM / admin123");
  console.log("Empresa demo: RINCON-Z (plan Empresa, dueña de las sucursales legacy)");
  if (SEED_DEMO)
    console.log("Trabajadores demo: ANA@DEMO.COM, CARLOS@DEMO.COM, MARIA@DEMO.COM, JAVIER@DEMO.COM, LUCIA@DEMO.COM, PEDRO@DEMO.COM / trabajador123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
