import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const GLOBAL = "global";
const SEED_DEMO = process.env.SEED_DEMO === "true";
const RINCONZ_COMPANY_ID = "company-rincon-z";

const DEFAULT_PLANS = [
  {
    code: "basico",
    name: "Básico",
    description: "Para una sucursal que recién organiza sus turnos.",
    priceMensual: 19990,
    priceAnual: 199900,
    maxBranches: 1,
    maxWorkers: 30,
    features: JSON.stringify([
      "1 sucursal",
      "Hasta 30 trabajadores",
      "Calendario de turnos",
      "Mural de avisos",
      "Encuestas y votaciones",
    ]),
  },
  {
    code: "pro",
    name: "Pro",
    description: "Para equipos que crecen y necesitan varias sucursales.",
    priceMensual: 39990,
    priceAnual: 399900,
    maxBranches: 5,
    maxWorkers: 150,
    features: JSON.stringify([
      "Hasta 5 sucursales",
      "Hasta 150 trabajadores",
      "Todo lo del Básico",
      "Filtro por cargo y departamento",
      "Exportación a Excel",
    ]),
  },
  {
    code: "empresa",
    name: "Empresa",
    description: "Para organizaciones grandes con muchas sucursales.",
    priceMensual: 79990,
    priceAnual: 799900,
    maxBranches: 9999,
    maxWorkers: 99999,
    features: JSON.stringify([
      "Sucursales y trabajadores ilimitados",
      "Todo lo del Pro",
      "Roles y permisos avanzados",
      "Soporte prioritario",
    ]),
  },
];

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const workerPassword = await bcrypt.hash("trabajador123", 10);

  const central = await prisma.branch.upsert({
    where: { id: "branch-central" },
    update: { name: "Sucursal Central" },
    create: { id: "branch-central", name: "Sucursal Central" },
  });

  const norte = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: { name: "Sucursal Norte" },
    create: { id: "branch-norte", name: "Sucursal Norte" },
  });

  const dios = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: { role: "dios", branchId: null, name: "Cuenta DIOS" },
    create: {
      name: "Cuenta DIOS",
      email: "admin@demo.com",
      password: adminPassword,
      role: "dios",
      department: "Dirección",
    },
  });

  const superRincon = await prisma.user.upsert({
    where: { email: "super@demo.com" },
    update: { role: "superadmin", branchId: central.id },
    create: {
      name: "Super Admin Rincon-Z",
      email: "super@demo.com",
      password: adminPassword,
      role: "superadmin",
      department: "Dirección",
      branchId: central.id,
    },
  });

  const adminCentral = await prisma.user.upsert({
    where: { email: "central@demo.com" },
    update: { role: "admin", branchId: central.id },
    create: {
      name: "Admin Central",
      email: "central@demo.com",
      password: adminPassword,
      role: "admin",
      department: "Dirección",
      branchId: central.id,
    },
  });

  const adminNorte = await prisma.user.upsert({
    where: { email: "norte@demo.com" },
    update: { role: "admin", branchId: norte.id },
    create: {
      name: "Admin Norte",
      email: "norte@demo.com",
      password: adminPassword,
      role: "admin",
      department: "Dirección",
      branchId: norte.id,
    },
  });

  const workers = [
    { name: "Ana López", email: "ana@demo.com", department: "Ventas", cargo: "Vendedor", branchId: central.id },
    { name: "Carlos Ruiz", email: "carlos@demo.com", department: "Almacén", cargo: "Técnico", branchId: central.id },
    { name: "María Gómez", email: "maria@demo.com", department: "Atención al cliente", cargo: "Auxiliar", branchId: central.id },
    { name: "Javier Martín", email: "javier@demo.com", department: "Ventas", cargo: "Vendedor", branchId: central.id },
    { name: "Lucía Pérez", email: "lucia@demo.com", department: "Atención al cliente", cargo: "Auxiliar", branchId: norte.id },
    { name: "Pedro Sánchez", email: "pedro@demo.com", department: "Almacén", cargo: "Técnico", branchId: norte.id },
  ];

  const announcementExamples = [
    {
      content:
        "📢 Recordatorio: la nueva rotación de turnos entra en vigor el lunes. Revisad el calendario y avisad si hay conflictos.",
      pinned: true,
    },
    {
      content:
        "☕ La máquina de café del almacén está arreglada. ¡Gracias por vuestra paciencia!",
      pinned: false,
    },
  ];

  const pollExamples = [
    {
      question: "¿Qué día preferís para la próxima formación de seguridad?",
      options: ["Lunes", "Miércoles", "Viernes"],
    },
    {
      question: "¿Estáis de acuerdo con ampliar el descanso a 30 minutos?",
      options: ["Sí, totalmente", "No, está bien así"],
    },
  ];

  if (SEED_DEMO) {
    for (const w of workers) {
      await prisma.user.upsert({
        where: { email: w.email },
        update: { role: "worker", branchId: w.branchId },
        create: {
          name: w.name,
          email: w.email,
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
    update: { name: "Rincon-Z", status: "activa", planId: empresaPlan?.id ?? null },
    create: {
      id: RINCONZ_COMPANY_ID,
      name: "Rincon-Z",
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

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "shiftTypeLabels" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "shiftTypeLabels",
      value: JSON.stringify({
        manana: "Mañana",
        tarde: "Tarde",
        noche: "Noche",
        completo: "Completo",
        otro: "Otro",
      }),
    },
  });

  await prisma.setting.upsert({
    where: { branchId_key: { branchId: GLOBAL, key: "cargos" } },
    update: {},
    create: {
      branchId: GLOBAL,
      key: "cargos",
      value: JSON.stringify(["Enfermero", "Médico", "Técnico", "Auxiliar", "Administrativo"]),
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

  console.log("Seed completado.");
  console.log("Cuenta DIOS: admin@demo.com / admin123");
  console.log("Super Admin (empresa): super@demo.com / admin123");
  console.log("Admin Central: central@demo.com / admin123");
  console.log("Admin Norte: norte@demo.com / admin123");
  console.log("Empresa demo: Rincon-Z (plan Empresa, dueña de las sucursales legacy)");
  if (SEED_DEMO)
    console.log("Trabajadores demo: ana@demo.com, carlos@demo.com, maria@demo.com, javier@demo.com, lucia@demo.com, pedro@demo.com / trabajador123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });