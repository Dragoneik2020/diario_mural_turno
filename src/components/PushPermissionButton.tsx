"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Send } from "lucide-react";

function decodeKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  }).catch(() => null);
  return !!response?.ok;
}

export default function PushPermissionButton() {
  const [state, setState] = useState<"loading" | "hidden" | "available" | "active" | "blocked">("loading");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("hidden");
        return;
      }
      const response = await fetch("/api/push/public-key").catch(() => null);
      const data = response?.ok ? await response.json().catch(() => null) : null;
      if (cancelled || !data?.configured || !data.publicKey) {
        if (!cancelled) setState("hidden");
        return;
      }
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register("/sw.js"));
        const existing = await registration.pushManager.getSubscription();
        if (existing && Notification.permission === "granted") {
          const ok = await saveSubscription(existing);
          if (!cancelled) setState(ok ? "active" : "available");
          return;
        }
      } catch {
        /* se intentará al presionar el botón */
      }
      if (!cancelled) setState(Notification.permission === "granted" ? "available" : "available");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function activate() {
    setBusy(true);
    setMessage("");
    try {
      const keyResponse = await fetch("/api/push/public-key");
      const { publicKey } = await keyResponse.json();
      if (!publicKey) throw new Error();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        setMessage("Activa las notificaciones desde los ajustes del navegador.");
        return;
      }
      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(publicKey) as unknown as BufferSource,
        }));
      const ok = await saveSubscription(subscription);
      if (!ok) throw new Error();
      setState("active");
      setMessage("Notificaciones activadas en este celular");
    } catch {
      setMessage("No se pudieron activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setMessage("Prueba enviada: revisa las notificaciones del celular");
    } catch {
      setMessage("No se pudo enviar la prueba.");
    } finally {
      setTesting(false);
    }
  }

  if (state === "loading" || state === "hidden") return null;
  if (state === "active") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
          <BellRing className="h-4 w-4" /> Notificaciones activas
        </span>
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="btn-ghost min-h-9 px-3 text-xs"
        >
          <Send className="h-3.5 w-3.5" /> {testing ? "Enviando…" : "Probar"}
        </button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    );
  }
  if (state === "blocked") {
    return <span className="text-xs text-amber-300" title={message}>Notificaciones bloqueadas</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={activate} disabled={busy} className="btn-primary min-h-11 px-4 text-sm">
        <Bell className="h-4 w-4" /> {busy ? "Activando…" : "Activar notificaciones"}
      </button>
      {message && <span className="text-xs text-amber-300">{message}</span>}
    </div>
  );
}
