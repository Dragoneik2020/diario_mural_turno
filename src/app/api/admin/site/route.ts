import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDios } from "@/lib/session";
import { getSiteConfig, DEFAULT_SITE_CONFIG, SITE_ICON_KEYS } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function strArray(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
  return fallback;
}

function notEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET() {
  try {
    await requireDios();
    const config = await getSiteConfig();
    return NextResponse.json({ config });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireDios();
    const body = await req.json();
    const b = body?.config ? body.config : body;
    const current = await getSiteConfig();

    const features = Array.isArray(b.features)
      ? b.features
          .filter(
            (f: any) =>
              f &&
              typeof (f as any).title === "string" &&
              notEmpty((f as any).title) &&
              typeof (f as any).desc === "string"
          )
          .map((f: any) => ({
            icon: SITE_ICON_KEYS.includes((f as any).icon)
              ? (f as any).icon
              : "CalendarRange",
            title: str((f as any).title),
            desc: str((f as any).desc),
          }))
          .slice(0, 8)
      : current.features;

    const hierarchy = Array.isArray(b.hierarchy)
      ? b.hierarchy
          .filter(
            (h: any) =>
              h &&
              notEmpty((h as any).title) &&
              typeof (h as any).desc === "string"
          )
          .map((h: any) => ({
            icon: SITE_ICON_KEYS.includes((h as any).icon)
              ? (h as any).icon
              : "Building2",
            title: str((h as any).title),
            desc: str((h as any).desc),
          }))
          .slice(0, 4)
      : current.hierarchy;

    const config = {
      appName: str(b.appName, DEFAULT_SITE_CONFIG.appName),
      heroBadge: str(b.heroBadge ?? current.heroBadge, DEFAULT_SITE_CONFIG.heroBadge ?? ""),
      heroTitle: str(b.heroTitle, DEFAULT_SITE_CONFIG.heroTitle),
      heroSubtitle: str(b.heroSubtitle, DEFAULT_SITE_CONFIG.heroSubtitle),
      heroCtaLabel: str(b.heroCtaLabel, DEFAULT_SITE_CONFIG.heroCtaLabel),
      capabilities: strArray(b.capabilities, current.capabilities).slice(0, 20),
      features,
      hierarchy,
      accesoTitulo: str(b.accesoTitulo, DEFAULT_SITE_CONFIG.accesoTitulo),
      accesoSubtitle: str(b.accesoSubtitle, DEFAULT_SITE_CONFIG.accesoSubtitle),
    };

    await prisma.setting.upsert({
      where: { branchId_key: { branchId: "global", key: "landing" } },
      update: { value: JSON.stringify(config) },
      create: { branchId: "global", key: "landing", value: JSON.stringify(config) },
    });
    return NextResponse.json({ config, ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHENTICATED" || e.message === "FORBIDDEN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}