"use client";

import { useState, useEffect, useCallback } from "react";

interface EmailConnInfo {
  connected: boolean;
  provider?: string;
  email?: string;
}

interface EmailConfigs {
  company: EmailConnInfo | null;
  branches: { id: string; name: string; connected: boolean; provider?: string; email?: string }[];
}

interface EmailNotificationsEditorProps {
  canManageCompanyEmail?: boolean;
  canManageBranchEmail?: boolean;
}

export default function EmailNotificationsEditor({
  canManageCompanyEmail = false,
  canManageBranchEmail = false,
}: EmailNotificationsEditorProps) {
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningSubject, setMorningSubject] = useState("");
  const [morningBody, setMorningBody] = useState("");

  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeSubject, setWelcomeSubject] = useState("");
  const [welcomeBody, setWelcomeBody] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [cronSecret, setCronSecret] = useState("");

  const [emailData, setEmailData] = useState<EmailConfigs | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadEmailConfigs = useCallback(() => {
    fetch("/api/email/configs")
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.branches)) setEmailData(d);
      })
      .catch(() => setEmailData(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get("email");
    if (st === "connected") setEmailMsg({ text: "Correo del negocio conectado correctamente.", ok: true });
    else if (st) setEmailMsg({ text: "No se pudo conectar: " + st.replace(/^error:/, ""), ok: false });

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
        setWelcomeEnabled(c.welcomeEnabled === undefined ? true : !!c.welcomeEnabled);
        setWelcomeSubject(c.welcomeSubject || "");
        setWelcomeBody(c.welcomeBody || "");
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

    if (canManageCompanyEmail || canManageBranchEmail) loadEmailConfigs();
  }, [canManageCompanyEmail, canManageBranchEmail, loadEmailConfigs]);

  async function disconnectEmail(branchId?: string) {
    setBusy(true);
    try {
      const qs = branchId
        ? `?scope=branch&branchId=${encodeURIComponent(branchId)}`
        : `?scope=company`;
      const res = await fetch(`/api/email/config${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      setEmailMsg({
        text: branchId
          ? "Correo de la sucursal desconectado. Usará el de la empresa o el SMTP global."
          : "Correo de la empresa desconectado. Usará el SMTP global.",
        ok: true,
      });
      loadEmailConfigs();
    } catch {
      setEmailMsg({ text: "No se pudo desconectar el correo.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  function ConnectButtons({ branchId }: { branchId?: string }) {
    const qs = branchId ? `?scope=branch&branchId=${encodeURIComponent(branchId)}` : "";
    return (
      <div className="flex flex-wrap gap-2">
        <a href={`/api/email/connect/google${qs}`} className="btn-primary text-sm">
          Conectar Gmail
        </a>
        <a href={`/api/email/connect/microsoft${qs}`} className="btn-primary text-sm">
          Conectar Outlook
        </a>
      </div>
    );
  }

  function ConnBadge({ info }: { info: EmailConnInfo }) {
    if (!info?.connected) return null;
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        {info.provider === "google" ? "Gmail" : "Outlook"} · {info.email}
      </span>
    );
  }

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
            welcomeEnabled,
            welcomeSubject,
            welcomeBody,
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

      {/* Correo de bienvenida al crear cuenta */}
      <section className="border-t border-slate-100 pt-4">
        <h4 className="font-medium text-slate-700 mb-2">Correo de bienvenida (al crear cuenta)</h4>
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={welcomeEnabled}
            onChange={(e) => setWelcomeEnabled(e.target.checked)}
          />
          Enviar correo con las credenciales de acceso al crear una cuenta (web o carga masiva)
        </label>
        <div className="mb-3">
          <label className="label">Asunto</label>
          <input className="input" value={welcomeSubject} onChange={(e) => setWelcomeSubject(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="label">Cuerpo del mensaje</label>
          <textarea className="input min-h-[9rem]" value={welcomeBody} onChange={(e) => setWelcomeBody(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">
            Variables: {"{nombre}"}, {"{rut}"}, {"{clave}"}, {"{correo}"}, {"{url}"}
          </p>
        </div>
      </section>

      {/* Correo saliente del negocio (OAuth) */}
      {(canManageCompanyEmail || canManageBranchEmail) && (
        <section className="border-t border-slate-100 pt-4">
          <h4 className="font-medium text-slate-700 mb-2">Correo saliente del negocio</h4>
          <p className="text-sm text-slate-500 mb-3">
            Cada sucursal puede enviar desde su propio correo. Si una sucursal no conecta el suyo,
            usa el correo de la empresa; si la empresa tampoco, el SMTP global.
          </p>

          {emailMsg && (
            <p className={`text-sm mb-3 ${emailMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {emailMsg.text}
            </p>
          )}

          {canManageCompanyEmail && (
            <div className="mb-4 p-3 rounded-lg border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-700 text-sm">Empresa (todas las sucursales)</p>
                  <p className="text-xs text-slate-400">Correo por defecto para las sucursales sin configurar.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {emailData?.company?.connected && (
                    <ConnBadge info={emailData.company} />
                  )}
                  {emailData?.company?.connected ? (
                    <button className="btn-ghost text-sm" onClick={() => disconnectEmail()} disabled={busy}>
                      Desconectar
                    </button>
                  ) : (
                    <ConnectButtons />
                  )}
                </div>
              </div>
            </div>
          )}

          {canManageBranchEmail && (
            <div className="space-y-3">
              <p className="font-medium text-slate-700 text-sm">
                {emailData && emailData.branches.length > 0 ? "Por sucursal" : "Mi sucursal"}
              </p>
              {!emailData ? (
                <p className="text-sm text-slate-400">Cargando sucursales…</p>
              ) : emailData.branches.length === 0 ? (
                <p className="text-sm text-slate-400">No hay sucursales.</p>
              ) : (
                emailData.branches.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-700 text-sm">{b.name}</p>
                        <p className="text-xs text-slate-400">
                          {b.connected
                            ? "Correo propio de esta sucursal"
                            : "Usa el correo de la empresa o el SMTP global"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {b.connected && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {b.provider === "google" ? "Gmail" : "Outlook"} · {b.email}
                          </span>
                        )}
                        {b.connected ? (
                          <button
                            className="btn-ghost text-sm"
                            onClick={() => disconnectEmail(b.id)}
                            disabled={busy}
                          >
                            Desconectar
                          </button>
                        ) : (
                          <ConnectButtons branchId={b.id} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-3 p-3 rounded-lg bg-slate-50 text-xs text-slate-500">
            Los tokens se guardan cifrados en la base de datos y se renuevan solos. La conexión la
            puede hacer el administrador de cada sucursal, el administrador de la empresa o la
            cuenta DIOS en modo empresa.
          </div>
        </section>
      )}

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
