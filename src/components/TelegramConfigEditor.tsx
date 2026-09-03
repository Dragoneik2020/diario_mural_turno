"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DEFAULT_TELEGRAM, type TelegramConfig } from "@/lib/telegram";

export default function TelegramConfigEditor() {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/telegram");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setConfig(d.config || { ...DEFAULT_TELEGRAM });
    } catch {
      setError("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof TelegramConfig>(key: K, value: TelegramConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/telegram", {
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
            <span className="block text-sm font-semibold text-white">Habilitar envío por Telegram</span>
            <span className="block text-xs text-slate-400">
              Envía notificaciones de turnos por un bot de Telegram a cada trabajador.
            </span>
          </span>
        </label>

        <div>
          <label className={labelCls}>Token del bot (de @BotFather)</label>
          <input
            className={`${inputCls} font-mono`}
            type="password"
            placeholder="123456:ABC-DEF..."
            value={config.botToken}
            onChange={(e) => set("botToken", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Plantilla al asignar turno</label>
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

        <div>
          <label className={labelCls}>Plantilla de recordatorio matinal</label>
          <textarea
            rows={5}
            className={inputCls}
            value={config.morningTemplate}
            onChange={(e) => set("morningTemplate", e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Variables: {"{nombre}"}, {"{tipo}"}, {"{inicio}"}, {"{fin}"}.
          </p>
        </div>

        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3.5 py-2.5 text-xs text-blue-200">
          Cada trabajador debe tener su Chat ID de Telegram configurado en su cuenta (sección Cuentas) para
          recibir notificaciones.
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
