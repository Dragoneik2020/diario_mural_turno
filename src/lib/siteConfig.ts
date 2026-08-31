import { prisma } from "./prisma";

export const GLOBAL_BRANCH_ID = "global";

export interface SiteFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface SiteHierarchyItem {
  icon: string;
  title: string;
  desc: string;
}

export interface SiteConfig {
  appName: string;
  heroBadge?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  capabilities: string[];
  features: SiteFeature[];
  hierarchy: SiteHierarchyItem[];
  accesoTitulo: string;
  accesoSubtitle: string;
}

export const SITE_ICON_KEYS = [
  "CalendarRange",
  "Megaphone",
  "Vote",
  "BellRing",
  "ShieldCheck",
  "FileSpreadsheet",
  "Users",
  "Building2",
  "Layers",
  "Landmark",
] as const;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  appName: "Diario de Turnos",
  heroBadge: "",
  heroTitle: "Tu equipo. Tus turnos. Un solo mural.",
  heroSubtitle:
    "El diario mural digital de turnos para organizaciones con varias sucursales, departamentos y cargos.",
  heroCtaLabel: "Contrata aquÃ­",
  capabilities: [
    "Turnos por cargo",
    "MÃºltiples sucursales",
    "Mural de avisos",
    "Encuestas y votos",
    "Notificaciones",
    "Roles y permisos",
    "ExportaciÃ³n a Excel",
    "Historial completo",
  ],
  features: [
    { icon: "CalendarRange", title: "Calendario del equipo", desc: "Cada organizaciÃ³n ve su equipo completo o filtrado por cargo." },
    { icon: "Megaphone", title: "Mural de avisos", desc: "Publica novedades para todo el equipo o por sucursal." },
    { icon: "Vote", title: "Encuestas y votaciones", desc: "Consulta disponibilidad y preferencias con una votaciÃ³n simple." },
    { icon: "BellRing", title: "Notificaciones por correo", desc: "Avisos por email cuando cambia un turno o llega un aviso." },
    { icon: "ShieldCheck", title: "Roles y permisos", desc: "Super admin, admin y trabajador con alcance por sucursal." },
    { icon: "FileSpreadsheet", title: "ExportaciÃ³n a Excel", desc: "Descarga turnos y planillas para reportes y archivo." },
  ],
  hierarchy: [
    { icon: "Landmark", title: "Empresa", desc: "Un contrato Ãºnico para toda tu operaciÃ³n." },
    { icon: "Building2", title: "OrganizaciÃ³n", desc: "Cada sucursal u organizaciÃ³n gestiona su propio equipo." },
    { icon: "Layers", title: "Departamentos", desc: "Ordena al equipo por unidad y Ã¡rea de trabajo." },
    { icon: "Users", title: "Cargos", desc: "Filtra el calendario del equipo por rol y responsabilidad." },
  ],
  accesoTitulo: "Â¿Tu empresa ya contratÃ³ el servicio?",
  accesoSubtitle:
    "Entra al panel para gestionar organizaciones, sucursales, departamentos y cargos de tu equipo, o contrata un plan nuevo.",
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId: GLOBAL_BRANCH_ID, key: "landing" } },
  });
  if (!row) return { ...DEFAULT_SITE_CONFIG };
  try {
    const parsed = JSON.parse(row.value);
    return {
      ...DEFAULT_SITE_CONFIG,
      ...parsed,
      capabilities: Array.isArray(parsed.capabilities)
        ? parsed.capabilities.filter((x: unknown) => typeof x === "string")
        : DEFAULT_SITE_CONFIG.capabilities,
      features: Array.isArray(parsed.features)
        ? parsed.features
        : DEFAULT_SITE_CONFIG.features,
      hierarchy: Array.isArray(parsed.hierarchy)
        ? parsed.hierarchy
        : DEFAULT_SITE_CONFIG.hierarchy,
    };
  } catch {
    return { ...DEFAULT_SITE_CONFIG };
  }
}