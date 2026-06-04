import type * as React from 'react';
import Link from 'next/link';
import { services } from '@/composition';
import { currentUser } from '@/interfaces/http/session';
import { ImportBattleForm } from './import-battle-form';

export const runtime = 'nodejs';

export default async function Home() {
  const [battles, user] = await Promise.all([services.battleRepository.list(), currentUser()]);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <p style={{ color: 'var(--b)', fontWeight: 800, letterSpacing: '0.14em', fontSize: 12 }}>
        HISTORIC BATTLE LEAGUE
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 800, margin: '4px 0 24px' }}>🎤 Agent Contenders</h1>

      {battles.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>
          Aucune battle pour l&apos;instant{user?.isAdmin ? ' — importe un transcript ci-dessous.' : '.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
          {battles.map((b) => (
            <li
              key={b.slug}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {b.status} {b.isVotingOpen() ? '· vote ouvert' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href={`/b/${b.slug}`} style={pill('var(--gold)')}>
                  ▶ Player
                </Link>
                <Link href={`/b/${b.slug}/vote`} style={pill('transparent', true)}>
                  Voter
                </Link>
                {user?.isAdmin ? (
                  <Link href={`/b/${b.slug}/admin`} style={pill('transparent', true)}>
                    Admin
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {user?.isAdmin ? <ImportBattleForm /> : null}

      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 28 }}>
        Connecté{user ? ` : ${user.name ?? user.email}` : ''}
        {user?.isAdmin ? ' (admin)' : ''}
      </p>
    </main>
  );
}

function pill(bg: string, ghost = false): React.CSSProperties {
  return {
    background: bg,
    color: ghost ? 'var(--ink)' : '#08080c',
    border: ghost ? '1px solid var(--line)' : 'none',
    borderRadius: 100,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
  };
}
