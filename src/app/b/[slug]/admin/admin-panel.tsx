'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface Detail {
  title: string;
  status: string;
  votingOpen: boolean;
  voteClosesAt: string | null;
  segments: { turnIndex: number }[];
}

export function AdminPanel({ slug }: { slug: string }): React.ReactElement {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [json, setJson] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/battles/${slug}`, { cache: 'no-store' });
    const data = (await res.json()) as { ok: boolean; data?: Detail };
    if (data.ok && data.data) setDetail(data.data);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (action: 'start' | 'close' | 'finalize') => {
      setBusy(action);
      setMsg(null);
      try {
        const res = await fetch(`/api/battles/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        setMsg(data.ok ? `OK : ${action}` : (data.error ?? 'Erreur'));
        await load();
      } finally {
        setBusy(null);
      }
    },
    [slug, load],
  );

  const generate = useCallback(async () => {
    setBusy('generate');
    setMsg('Génération Lyria en cours… (piste complète, ~1-2 min)');
    try {
      const res = await fetch(`/api/battles/${slug}/generate`, { method: 'POST' });
      const data = (await res.json()) as { ok: boolean; data?: { synced: boolean }; error?: string };
      setMsg(
        data.ok
          ? `✅ Piste générée${data.data?.synced ? ' (paroles synchronisées)' : ' (synchro indisponible, suivi approximatif)'}.`
          : (data.error ?? 'Erreur'),
      );
      await load();
    } finally {
      setBusy(null);
    }
  }, [slug, load]);

  const importJson = useCallback(async () => {
    setBusy('import');
    setMsg(null);
    try {
      const parsed: unknown = JSON.parse(json);
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setMsg(data.ok ? '✅ Transcript importé.' : (data.error ?? 'Erreur'));
      await load();
    } catch {
      setMsg('JSON invalide.');
    } finally {
      setBusy(null);
    }
  }, [json, load]);

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Admin — {detail?.title ?? slug}</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        Statut : <b>{detail?.status ?? '—'}</b> · vote {detail?.votingOpen ? 'ouvert' : 'fermé'}
        {detail?.voteClosesAt ? ` (clôture ${new Date(detail.voteClosesAt).toLocaleTimeString('fr-FR')})` : ''} ·{' '}
        audio {(detail?.segments.length ?? 0) > 0 ? 'généré ✓' : 'non généré'}
      </p>

      <Section title="Audio">
        <button style={primary} disabled={busy !== null} onClick={() => void generate()}>
          {busy === 'generate' ? '⏳ Génération…' : '🎙 Générer l’audio (Lyria)'}
        </button>
      </Section>

      <Section title="Vote">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={ghost} disabled={busy !== null} onClick={() => void patch('start')}>
            Ouvrir le vote
          </button>
          <button style={ghost} disabled={busy !== null} onClick={() => void patch('close')}>
            Clôturer (+5 min)
          </button>
          <button style={ghost} disabled={busy !== null} onClick={() => void patch('finalize')}>
            Finaliser
          </button>
        </div>
      </Section>

      <Section title="QR de vote">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/battles/${slug}/qr`}
          alt="QR de vote"
          width={200}
          height={200}
          style={{ background: '#fff', borderRadius: 12, padding: 8 }}
        />
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Renvoie vers <code>/b/{slug}/vote</code>
        </p>
      </Section>

      <Section title="Importer un transcript">
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder="Colle ici le JSON de la battle (format /battle)…"
          rows={8}
          style={{
            width: '100%',
            background: 'var(--panel-2)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />
        <button style={ghost} disabled={busy !== null || json.trim().length === 0} onClick={() => void importJson()}>
          Importer
        </button>
      </Section>

      {msg ? <p style={{ marginTop: 18, fontWeight: 600 }}>{msg}</p> : null}
      <p style={{ marginTop: 24 }}>
        <a href={`/b/${slug}`} style={{ color: 'var(--gold)' }}>
          ← Voir le player
        </a>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section
      style={{
        marginTop: 18,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h2 style={{ fontSize: 13, letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 12px' }}>
        {title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}

const primary: React.CSSProperties = {
  background: 'var(--gold)',
  color: '#08080c',
  border: 'none',
  borderRadius: 100,
  padding: '11px 20px',
  fontWeight: 700,
  cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  background: 'var(--panel-2)',
  color: 'var(--ink)',
  border: '1px solid var(--line)',
  borderRadius: 100,
  padding: '11px 18px',
  fontWeight: 600,
  cursor: 'pointer',
};
