"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Pin, Check } from "lucide-react";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";

interface Announcement {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string };
}

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  createdAt: string;
  totalVotes: number;
  myVote?: string;
  options: PollOption[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function MuralPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/mural");
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      setAnnouncements(d.announcements);
      setPolls(d.polls);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function vote(pollId: string, optionId: string) {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    if (res.ok) {
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const hadVote = !!p.myVote;
          const options = p.options.map((o) => {
            let v = o.votes;
            if (o.id === optionId) v += 1;
            if (hadVote && o.id === p.myVote) v -= 1;
            return { ...o, votes: Math.max(0, v) };
          });
          return {
            ...p,
            myVote: optionId,
            totalVotes: hadVote ? p.totalVotes : p.totalVotes + 1,
            options,
          };
        })
      );
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Megaphone className="h-5 w-5 text-brand-600" /> Mural</h2>
        <button onClick={load} className="text-xs text-brand-600 hover:underline">
          Actualizar
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando…</p>}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl p-3 border ${
              a.pinned
                ? "border-brand-200 bg-brand-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {a.pinned && <Pin className="h-3.5 w-3.5 text-brand-600" />}
              <Avatar name={a.author.name} size="sm" />
              <span className="text-xs text-slate-500">
                {a.author.name} · {timeAgo(a.createdAt)}
              </span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}
        {announcements.length === 0 && (
          <EmptyState icon={Megaphone} title="Sin anuncios" hint="Los avisos del equipo aparecerán aquí." />
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Encuestas
        </div>
        {polls.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-800 mb-2">
              {p.question}
            </div>
            {p.myVote ? (
              <div className="space-y-1.5">
                {p.options.map((o) => {
                  const pct =
                    p.totalVotes > 0 ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                  const mine = o.id === p.myVote;
                  return (
                    <div key={o.id}>
                      <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                        <span>
                          {o.label} {mine && <Check className="inline h-3.5 w-3.5 text-brand-600" />}
                        </span>
                        <span>
                          {o.votes} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${mine ? "bg-brand-500" : "bg-slate-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="text-[11px] text-slate-400 mt-1">
                  {p.totalVotes} respuesta(s)
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {p.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => vote(p.id, o.id)}
                    className="w-full text-left text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {polls.length === 0 && (
          <p className="text-sm text-slate-400">Sin encuestas activas.</p>
        )}
      </div>
    </section>
  );
}
