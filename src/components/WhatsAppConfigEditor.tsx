"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DEFAULT_WHATSAPP, type WhatsAppConfig } from "@/lib/whatsapp";

export default function WhatsAppConfigEditor() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setConfig(d.config || { ...DEFAULT_WHATSAPP });
    } catch {
      setError("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof WhatsAppConfig>(key: K, value: WhatsAppConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/whatsapp", {
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

  const inputCls = "input text-sm";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-400";

  if (loading) return <p className="text-sm text-slate-400">Cargando configuración…</p>;
  if (!config) return <p className="text-sm text-slate-400">Sin configuración disponible.</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      <section className="card space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={config.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-white">Habilitar envío por WhatsApp</span>
            <span className="block text-xs text-slate-400">
              Envía notificaciones de turnos por WhatsApp Cloud API.
            </span>
          </span>
        </label>

        <div>
          <label className={labelCls}>Token de acceso (Bearer)</label>
          <input
            className={`${inputCls} font-mono`}
            type="password"
            placeholder="EAAG..."
            value={config.accessToken}
            onChange={(e) => set("accessToken", e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Phone Number ID (WhatsApp)</label>
            <input
              className={inputCls}
              placeholder="123456789012345"
              value={config.phoneNumberId}
              onChange={(e) => set("phoneNumberId", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Número emisor visible</label>
            <input
              className={inputCls}
              placeholder="+56 9 1234 5678"
              value={config.senderPhone}
              onChange={(e) => set("senderPhone", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Webhook verify token</label>
          <input
            className={`${inputCls} font-mono`}
            placeholder="Clave para validar el webhook de Meta"
            value={config.webhookSecret}
            onChange={(e) => set("webhookSecret", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Plantilla del mensaje</label>
          <textarea
            rows={5}
            className={inputCls}
            value={config.messageTemplate}
            onChange={(e) => set("messageTemplate", e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Variables: {"{nombre}"}, {"{tipo}"}, {"{fecha}"}, {"{inicio}"}, {"{fin}"}.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
          <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-300">¡Configuración guardada!</span>}
      </div>
    </div>
  );
}