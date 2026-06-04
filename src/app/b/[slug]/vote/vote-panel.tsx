'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

type Side = 'A' | 'B';
interface RapperDTO {
  name: string;
}
interface VoteState {
  title: string;
  votingOpen: boolean;
  rappers: { A: RapperDTO; B: RapperDTO };
  myVote: Side | null;
}

export function VotePanel({ slug }: { slug: string }): React.ReactElement {
  const [state, setState] = useState<VoteState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/battles/${slug}`, { cache: 'no-store' });
    const json = (await res.json()) as {
      ok: boolean;
      data?: VoteState & { myVote: Side | null };
      error?: string;
    };
    if (!json.ok || !json.data) {
      setError(json.error ?? 'Erreur');
      return;
    }
    setState({
      title: json.data.title,
      votingOpen: json.data.votingOpen,
      rappers: json.data.rappers,
      myVote: json.data.myVote,
    });
  }, [slug]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  const vote = useCallback(
    async (choice: Side) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/battles/${slug}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choice }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (!json.ok) {
          setError(json.error ?? 'Vote impossible');
        } else {
          setState((s) => (s ? { ...s, myVote: choice } : s));
        }
      } finally {
        setBusy(false);
      }
    },
    [slug],
  );

  if (error && !state) return <main className="vt-wrap"><p>⚠️ {error}</p><VoteStyles /></main>;
  if (!state) return <main className="vt-wrap"><p>Chargement…</p><VoteStyles /></main>;

  return (
    <main className="vt-wrap">
      <VoteStyles />
      <p className="vt-league">HISTORIC BATTLE LEAGUE</p>
      <h1 className="vt-title">{state.title}</h1>
      <p className="vt-sub">
        {state.votingOpen ? 'Pour qui votes-tu ? (modifiable tant que le vote est ouvert)' : 'Le vote est fermé.'}
      </p>

      <div className="vt-grid">
        <button
          className={`vt-pick a ${state.myVote === 'A' ? 'on' : ''}`}
          disabled={!state.votingOpen || busy}
          onClick={() => void vote('A')}
        >
          <span className="vt-side">A</span>
          <span className="vt-name">{state.rappers.A.name}</span>
          {state.myVote === 'A' ? <span className="vt-check">✓ Ton vote</span> : null}
        </button>
        <button
          className={`vt-pick b ${state.myVote === 'B' ? 'on' : ''}`}
          disabled={!state.votingOpen || busy}
          onClick={() => void vote('B')}
        >
          <span className="vt-side">B</span>
          <span className="vt-name">{state.rappers.B.name}</span>
          {state.myVote === 'B' ? <span className="vt-check">✓ Ton vote</span> : null}
        </button>
      </div>

      {error ? <p className="vt-err">{error}</p> : null}
      {state.myVote ? <p className="vt-ok">Vote enregistré. Merci ! 🎤</p> : null}

      <VoteStyles />
    </main>
  );
}

function VoteStyles(): React.ReactElement {
  return (
    <style>{`
      .vt-wrap{max-width:520px;margin:0 auto;padding:36px 20px;text-align:center;}
      .vt-league{color:var(--b);font-weight:800;letter-spacing:.16em;font-size:11px;}
      .vt-title{font-size:24px;font-weight:800;font-style:italic;margin:6px 0 4px;}
      .vt-sub{color:var(--muted);font-size:14px;margin-bottom:24px;}
      .vt-grid{display:grid;gap:14px;}
      .vt-pick{display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px 18px;border-radius:18px;background:var(--panel);border:2px solid var(--line);color:var(--ink);cursor:pointer;transition:all .2s ease;}
      .vt-pick:disabled{opacity:.6;cursor:default;}
      .vt-side{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;}
      .vt-pick.a .vt-side{background:rgba(59,130,246,.18);color:#7fb0ff;}
      .vt-pick.b .vt-side{background:rgba(239,68,68,.18);color:#ff8a8a;}
      .vt-name{font-size:20px;font-weight:800;}
      .vt-pick.a.on{border-color:var(--a);box-shadow:0 0 26px rgba(59,130,246,.35);}
      .vt-pick.b.on{border-color:var(--b);box-shadow:0 0 26px rgba(239,68,68,.35);}
      .vt-check{font-size:12px;font-weight:700;color:var(--gold);}
      .vt-ok{color:#7ee0a2;font-size:14px;margin-top:18px;font-weight:600;}
      .vt-err{color:#ff8a8a;font-size:14px;margin-top:14px;}
    `}</style>
  );
}
