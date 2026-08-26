import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const workerPassword = await bcrypt.hash("trabajador123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@demo.com",
      password: adminPassword,
      role: "admin",
      department: "Dirección",
    },
  });

  const workers = [
    { name: "Ana López", email: "ana@demo.com", department: "Ventas", cargo: "Vendedor" },
    { name: "Carlos Ruiz", email: "carlos@demo.com", department: "Almacén", cargo: "Técnico" },
    { name: "María Gómez", email: "maria@demo.com", department: "Atención al cliente", cargo: "Auxiliar" },
    { name: "Javier Martín", email: "javier@demo.com", department: "Ventas", cargo: "Vendedor" },
  ];

  for (const w of workers) {
    await prisma.user.upsert({
      where: { email: w.email },
      update: {},
      create: {
        name: w.name,
        email: w.email,
        password: workerPassword,
        role: "worker",
        department: w.department,
        cargo: w.cargo,
      },
    });
  }

  // Seed some sample shifts for the last 7 days for each worker
  const allWorkers = await prisma.user.findMany({ where: { role: "worker" } });
  const types = ["manana", "tarde", "noche", "completo"] as const;
  const now = new Date();

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
          date: start,
          start,
          end,
          type,
          notes: d === 0 ? "Turno de ejemplo" : undefined,
        },
      });
    }
  }

  const existingAnns = await prisma.announcement.count();
  if (existingAnns === 0) {
    await prisma.announcement.create({
      data: {
        authorId: admin.id,
        content:
          "📢 Recordatorio: la nueva rotación de turnos entra en vigor el lunes. Revisad el calendario y avisad si hay conflictos.",
        pinned: true,
      },
    });
    await prisma.announcement.create({
      data: {
        authorId: admin.id,
        content:
          "☕ La máquina de café del almacén está arreglada. ¡Gracias por vuestra paciencia!",
      },
    });
  }

  const existingPolls = await prisma.poll.count();
  if (existingPolls === 0) {
    await prisma.poll.create({
      data: {
        authorId: admin.id,
        question: "¿Qué día preferís para la próxima formación de seguridad?",
        options: {
          create: [
            { label: "Lunes", order: 0 },
            { label: "Miércoles", order: 1 },
            { label: "Viernes", order: 2 },
          ],
        },
      },
    });
    await prisma.poll.create({
      data: {
        authorId: admin.id,
        question: "¿Estáis de acuerdo con ampliar el descanso a 30 minutos?",
        options: {
          create: [
            { label: "Sí, totalmente", order: 0 },
            { label: "No, está bien así", order: 1 },
          ],
        },
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "shiftTypeLabels" },
    update: {},
    create: {
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
    where: { key: "cargos" },
    update: {},
    create: {
      key: "cargos",
      value: JSON.stringify(["Enfermero", "Médico", "Técnico", "Auxiliar", "Administrativo"]),
    },
  });

  await prisma.setting.upsert({
    where: { key: "emailNotifications" },
    update: {},
    create: {
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
  console.log("Admin: admin@demo.com / admin123");
  console.log("Trabajadores: ana@demo.com, carlos@demo.com, maria@demo.com, javier@demo.com / trabajador123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
