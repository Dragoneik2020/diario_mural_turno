"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as any).standalone === true;
}

export default function InstallPwaButton() {
  const [state, setState] = useState<"loading" | "installed" | "prompt" | "ios" | "hidden">("loading");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setState("installed");
      return;
    }
    if (isIos()) {
      setState("ios");
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setState("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => {
      setState((s) => (s === "loading" ? "hidden" : s));
    }, 3000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setState("installed");
      }
    } catch {
      /* el usuario puede instalar desde el menú del navegador */
    } finally {
      setBusy(false);
      setDeferred(null);
    }
  }

  if (state === "loading" || state === "hidden") return null;
  if (state === "installed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <CheckCircle2 className="h-4 w-4" /> App instalada
      </span>
    );
  }
  if (state === "ios") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-slate-400">
        <Share className="mt-0.5 h-4 w-4 shrink-0" />
        En iPhone: Compartir → “Agregar a pantalla de inicio” para instalar la app y recibir avisos.
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={install}
      disabled={busy || !deferred}
      className="btn-ghost min-h-11 px-4 text-sm"
    >
      <Download className="h-4 w-4" /> {busy ? "Instalando…" : "Agregar a inicio"}
    </button>
  );
}
