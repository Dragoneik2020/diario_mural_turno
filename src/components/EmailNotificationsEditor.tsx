"use client";

import { useState, useEffect } from "react";

export default function EmailNotificationsEditor() {
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningSubject, setMorningSubject] = useState("");
  const [morningBody, setMorningBody] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [cronSecret, setCronSecret] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/email-notifications")
      .then((r) => r.json())
      .then((d) => {
        const c = d.config || {};
        setEnabled(!!c.enabled);
        setSubject(c.subject || "");
        setBody(c.body || "");
        setMorningEnabled(!!c.morningEnabled);
        setMorningSubject(c.morningSubject || "");
        setMorningBody(c.morningBody || "");
        const s = d.smtp || {};
        setSmtpHost(s.host || "");
        setSmtpPort(String(s.port || 587));
        setSmtpSecure(!!s.secure);
        setSmtpUser(s.user || "");
         setSmtpPass("");
        setSmtpFrom(s.from || "");
         setCronSecret("");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/email-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            enabled,
            subject,
            body,
            morningEnabled,
            morningSubject,
            morningBody,
          },
          smtp: {
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: smtpSecure,
            user: smtpUser,
             ...(smtpPass ? { pass: smtpPass } : {}),
            from: smtpFrom,
          },
           ...(cronSecret ? { cronSecret } : {}),
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMsg("Configuración guardada");
    } catch {
      setMsg("No se pudo guardar la configuración");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="card space-y-6">
      <div>
        <h3 className="card-title">Notificaciones por email</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sin costo para ti: usa un proveedor SMTP de tier gratis (Resend, SendGrid, Gmail…).
        </p>
      </div>

      {/* Aviso al asignar */}
      <section className="border-t border-slate-100 pt-4">
        <h4 className="font-medium text-slate-700 mb-2">Aviso al asignar turno</h4>
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Activar aviso al asignar un turno a un trabajador
        </label>
        <div className="mb-3">
          <label className="label">Asunto</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="label">Cuerpo del mensaje</label>
          <textarea className="input min-h-[7rem]" value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">
            Variables: {"{nombre}"}, {"{tipo}"}, {"{fecha}"}, {"{inicio}"}, {"{fin}"}, {"{cargo}"},{" "}
            {"{estado}"}, {"{notas}"}, {"{turno}"}
          </p>
        </div>
      </section>

      {/* Recordatorio matutino */}
      <section className="border-t border-slate-100 pt-4">
        <h4 className="font-medium text-slate-700 mb-2">Recordatorio matutino (el día del turno)</h4>
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={morningEnabled}
            onChange={(e) => setMorningEnabled(e.target.checked)}
          />
          Activar recordatorio cada mañana a quienes tienen turno ese día
        </label>
        <div className="mb-3">
          <label className="label">Asunto del recordatorio</label>
          <input
            className="input"
            value={morningSubject}
            onChange={(e) => setMorningSubject(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="label">Cuerpo del recordatorio</label>
          <textarea
            className="input min-h-[7rem]"
            value={morningBody}
            onChange={(e) => setMorningBody(e.target.value)}
          />
        </div>
        <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-500">
          <p className="font-medium text-slate-600 mb-1">Programar el envío automático</p>
          <p>El envío lo dispara una tarea externa (cron) que llame a diario (ej. 07:00) a:</p>
          <pre className="mt-1 bg-slate-100 p-2 rounded overflow-auto text-[11px]">
POST /api/cron/morning-reminder{"\n"}Header: x-cron-secret: {cronSecret || "TU_CRON_SECRET"}
          </pre>
          <p className="mt-1">
            Usa cron-job.org, GitHub Actions o el programador de Dokploy. El secreto se define abajo.
          </p>
        </div>
      </section>

      {/* Configuración del servidor */}
      <section className="border-t border-slate-100 pt-4">
        <h4 className="font-medium text-slate-700 mb-2">Configuración del servidor (SMTP)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Servidor SMTP (host)</label>
            <input className="input" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
          </div>
          <div>
            <label className="label">Puerto</label>
            <input className="input" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
          </div>
          <div>
            <label className="label">Usuario</label>
            <input className="input" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          </div>
          <div>
            <label className="label">Contraseña / Token</label>
           <input className="input" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="Dejar vacío para conservar" />
          </div>
          <div>
            <label className="label">Remitente (From)</label>
            <input className="input" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder='Turnos <no-reply@dominio.com>' />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-6">
            <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
            Conexión segura (SSL/TLS)
          </label>
        </div>

        <div className="mt-3">
          <label className="label">Secreto del recordatorio (CRON_SECRET)</label>
          <input
            className="input"
             value={cronSecret}
            onChange={(e) => setCronSecret(e.target.value)}
             placeholder="Dejar vacío para conservar el actual"
          />
          <p className="text-xs text-slate-400 mt-1">
            Debe coincidir con la cabecera <code>x-cron-secret</code> que envíe tu tarea programada.
          </p>
        </div>
      </section>

      <div className="border-t border-slate-100 pt-4">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </div>
    </div>
  );
}
