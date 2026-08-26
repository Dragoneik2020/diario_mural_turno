"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Megaphone, Pin } from "lucide-react";

interface Announcement {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string };
}

interface Poll {
  id: string;
  question: string;
  _count?: { votes: number };
}

export default function MuralManager() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, m] = await Promise.all([
      fetch("/api/announcements").then((r) => r.json()),
      fetch("/api/mural").then((r) => r.json()),
    ]);
    if (a.announcements) setAnnouncements(a.announcements);
    if (m.polls) setPolls(m.polls);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAnn() {
    if (!content.trim()) return;
    setBusy(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, pinned }),
    });
    setBusy(false);
    setContent("");
    setPinned(false);
    router.refresh();
    load();
  }

  async function deleteAnn(id: string) {
    if (!confirm("¿Eliminar anuncio?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    load();
  }

  async function createPoll() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) return;
    setBusy(true);
    await fetch("/api/mural", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options: opts }),
    });
    setBusy(false);
    setQuestion("");
    setOptions(["", ""]);
    router.refresh();
    load();
  }

  async function deletePoll(id: string) {
    if (!confirm("¿Eliminar encuesta?")) return;
    await fetch(`/api/polls/${id}`, { method: "DELETE" });
    load();
  }

  function setOpt(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Megaphone className="h-5 w-5 text-brand-600" /> Gestión del muro</h2>

      <div className="space-y-2 mb-5">
        <div className="text-sm font-medium text-slate-600">Nuevo anuncio</div>
        <textarea
          className="input"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un anuncio para el equipo…"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Fijar (destacado)
        </label>
        <button onClick={createAnn} disabled={busy} className="btn-primary">
          Publicar anuncio
        </button>
      </div>

      <div className="space-y-2 mb-5">
        <div className="text-sm font-medium text-slate-600">Nueva encuesta</div>
        <input
          className="input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pregunta de la encuesta"
        />
        {options.map((o, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input"
              value={o}
              onChange={(e) => setOpt(i, e.target.value)}
              placeholder={`Opción ${i + 1}`}
            />
            {options.length > 2 && (
                <button
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="btn-ghost px-2"
                >
                  <X className="h-4 w-4" />
                </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="text-xs text-brand-600 hover:underline"
        >
          + Añadir opción
        </button>
        <div>
          <button onClick={createPoll} disabled={busy} className="btn-primary mt-1">
            Crear encuesta
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Anuncios ({announcements.length})
        </div>
        <ul className="space-y-1 mb-4">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-slate-700">
                {a.pinned && <Pin className="inline h-3.5 w-3.5 text-brand-600" />}
                {a.content.slice(0, 80)}
                {a.content.length > 80 ? "…" : ""}
              </span>
              <button
                onClick={() => deleteAnn(a.id)}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                Eliminar
              </button>
            </li>
          ))}
          {announcements.length === 0 && (
            <li className="text-sm text-slate-400">Sin anuncios.</li>
          )}
        </ul>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Encuestas ({polls.length})
        </div>
        <ul className="space-y-1">
          {polls.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-slate-700">
                {p.question.slice(0, 80)}
                {p.question.length > 80 ? "…" : ""}
              </span>
              <button
                onClick={() => deletePoll(p.id)}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                Eliminar
              </button>
            </li>
          ))}
          {polls.length === 0 && (
            <li className="text-sm text-slate-400">Sin encuestas.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
