'use client';

import type * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Import d'un transcript de battle (admin) : colle le JSON ou choisis un
 * fichier .json, puis redirection vers l'écran admin de la battle créée.
 */
export function ImportBattleForm(): React.ReactElement {
  const router = useRouter();
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(setJson);
  };

  const submit = async (): Promise<void> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMsg('JSON invalide.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as { ok: boolean; data?: { slug: string }; error?: string };
      if (data.ok && data.data) {
        router.push(`/b/${data.data.slug}/admin`);
      } else {
        setMsg(data.error ?? "Erreur lors de l'import.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        marginTop: 28,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h2 style={{ fontSize: 13, letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 12px' }}>
        IMPORTER UNE BATTLE
      </h2>
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
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <button
          disabled={busy || json.trim().length === 0}
          onClick={() => void submit()}
          style={{
            background: 'var(--gold)',
            color: '#08080c',
            border: 'none',
            borderRadius: 100,
            padding: '11px 20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {busy ? '⏳ Import…' : 'Importer'}
        </button>
        <label style={{ color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
          …ou choisir un fichier .json{' '}
          <input type="file" accept=".json,application/json" onChange={onFile} style={{ fontSize: 12 }} />
        </label>
      </div>
      {msg ? <p style={{ marginTop: 12, fontWeight: 600 }}>{msg}</p> : null}
    </section>
  );
}
