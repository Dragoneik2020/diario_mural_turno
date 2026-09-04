"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";

function decodeKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export default function PushPermissionButton() {
  const [state, setState] = useState<"loading" | "hidden" | "available" | "active" | "blocked">("loading");
  const [busy, setBusy] = useState(false);
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
      if (Notification.permission === "denied") setState("blocked");
      else if (Notification.permission === "granted") setState("active");
      else setState("available");
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
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        setMessage("Activa las notificaciones desde los ajustes del navegador.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey) as unknown as BufferSource,
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error();
      setState("active");
      setMessage("Notificaciones activadas");
    } catch {
      setMessage("No se pudieron activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "hidden") return null;
  if (state === "active") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><BellRing className="h-4 w-4" /> Notificaciones activas</span>;
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
