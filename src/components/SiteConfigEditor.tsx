"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  SITE_ICON_KEYS,
  type SiteConfig,
  type SiteFeature,
  type SiteHierarchyItem,
} from "@/lib/siteConfig";

const DATA_URI = "data:application/json;base64,";

function encode(config: SiteConfig) {
  try {
    return DATA_URI + btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2))));
  } catch {
    return "";
  }
}

export default function SiteConfigEditor() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setConfig(d.config);
    } catch {
      setError("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function setFeature(i: number, patch: Partial<SiteFeature>) {
    set("features", config!.features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function setHierarchy(i: number, patch: Partial<SiteHierarchyItem>) {
    set("hierarchy", config!.hierarchy.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Error al guardar");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "input text-sm";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-400";

  if (loading) return <p className="text-sm text-slate-400">Cargando configuración…</p>;
  if (!config)
    return <p className="text-sm text-slate-400">No hay configuración disponible.</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Portada</h2>
          <p className="text-xs text-slate-400">Los textos principales de la página de inicio.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>Nombre de la aplicación</label>
            <input
              className={inputCls}
              value={config.appName}
              onChange={(e) => set("appName", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Frase de la portada (hero)</label>
            <textarea
              rows={3}
              className={inputCls}
              value={config.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Subtítulo de la portada</label>
            <textarea
              rows={3}
              className={inputCls}
              value={config.heroSubtitle}
              onChange={(e) => set("heroSubtitle", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Texto del botón principal</label>
            <input
              className={inputCls}
              value={config.heroCtaLabel}
              onChange={(e) => set("heroCtaLabel", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Texto de la insignia (opcional)</label>
            <input
              className={inputCls}
              value={config.heroBadge || ""}
              onChange={(e) => set("heroBadge", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Cinta de capacidades</h2>
          <p className="text-xs text-slate-400">Las frases del carrusel superior (una por línea).</p>
        </div>
        <textarea
          rows={7}
          className={inputCls}
          value={config.capabilities.join("\n")}
          onChange={(e) => set("capabilities", e.target.value.split("\n"))}
        />
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Funciones</h2>
          <p className="text-xs text-slate-400">Las tarjetas de la sección "Todo lo que necesita una operación".</p>
        </div>
        {config.features.map((f, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <div className="flex gap-3">
              <select
                className="input w-44 text-xs"
                value={f.icon}
                onChange={(e) => setFeature(i, { icon: e.target.value })}
              >
                {SITE_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <input
                className="input flex-1 text-sm"
                placeholder="Título"
                value={f.title}
                onChange={(e) => setFeature(i, { title: e.target.value })}
              />
            </div>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Descripción"
              value={f.desc}
              onChange={(e) => setFeature(i, { desc: e.target.value })}
            />
            {config.features.length > 1 && (
              <button
                className="text-xs font-semibold text-red-300 hover:text-red-200"
                onClick={() => set("features", config.features.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          className="btn-ghost px-3 text-xs"
          onClick={() => set("features", [...config.features, { icon: "CalendarRange", title: "", desc: "" }])}
        >
          + Agregar función
        </button>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Jerarquía</h2>
          <p className="text-xs text-slate-400">La sección "De la empresa al cargo".</p>
        </div>
        {config.hierarchy.map((h, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <div className="flex gap-3">
              <select
                className="input w-44 text-xs"
                value={h.icon}
                onChange={(e) => setHierarchy(i, { icon: e.target.value })}
              >
                {SITE_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <input
                className="input flex-1 text-sm"
                placeholder="Título"
                value={h.title}
                onChange={(e) => setHierarchy(i, { title: e.target.value })}
              />
            </div>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Descripción"
              value={h.desc}
              onChange={(e) => setHierarchy(i, { desc: e.target.value })}
            />
          </div>
        ))}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Sección de acceso / contratación</h2>
        </div>
        <div>
<label className={labelCls}>Título</label>
          <input
            className={inputCls}
            value={config.accesoTitulo}
            onChange={(e) => set("accesoTitulo", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Subtítulo</label>
          <textarea
            rows={3}
            className={inputCls}
            value={config.accesoSubtitle}
            onChange={(e) => set("accesoSubtitle", e.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
          <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-300">¡Cambios publicados!</span>}
        <a
          className="btn-ghost px-3 py-2 text-xs"
          download="landing-config.json"
          href={encode(config)}
        >
          <RotateCcw className="h-4 w-4" /> Exportar JSON
        </a>
      </div>
    </div>
  );
}