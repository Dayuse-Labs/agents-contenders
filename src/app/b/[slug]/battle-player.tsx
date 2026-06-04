'use client';

import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Side = 'A' | 'B';
interface RapperDTO {
  side: Side;
  name: string;
  agent: string;
  sex: string;
  age: number;
}
interface TimedBarDTO {
  verseIndex: number;
  rapper: Side;
  barIndex: number;
  text: string;
  startMs: number;
}
interface TrackDTO {
  url: string;
  mimeType: string;
  timings: TimedBarDTO[] | null;
}
interface TurnDTO {
  rapper: Side;
  bars: string[];
}
interface RoundDTO {
  round: number;
  turns: TurnDTO[];
}
interface Tally {
  A: number;
  B: number;
  total: number;
}
interface BattleDetail {
  slug: string;
  title: string;
  status: string;
  votingOpen: boolean;
  rappers: { A: RapperDTO; B: RapperDTO };
  transcript: RoundDTO[];
  track: TrackDTO | null;
  tally: Tally;
  myVote: Side | null;
  isAdmin: boolean;
}
interface Verse {
  index: number;
  round: number;
  rapper: Side;
  bars: string[];
}

async function getData(slug: string): Promise<BattleDetail> {
  const res = await fetch(`/api/battles/${slug}`, { cache: 'no-store' });
  const json = (await res.json()) as { ok: boolean; data?: BattleDetail; error?: string };
  if (!json.ok || !json.data) throw new Error(json.error ?? 'Erreur de chargement');
  return json.data;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Position de lecture : couplet courant + ligne courante. */
interface PlayPos {
  verseIndex: number;
  barIndex: number;
}

export function BattlePlayer({ slug }: { slug: string }): React.ReactElement {
  const [data, setData] = useState<BattleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<PlayPos>({ verseIndex: 0, barIndex: 0 });
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [tally, setTally] = useState<Tally>({ A: 0, B: 0, total: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getData(slug)
      .then((d) => {
        setData(d);
        setTally(d.tally);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [slug]);

  // Scores en direct
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/battles/${slug}/results`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j: { ok: boolean; data?: { tally: Tally } }) => {
          if (j.ok && j.data) setTally(j.data.tally);
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [slug]);

  const verses = useMemo<Verse[]>(() => {
    if (!data) return [];
    const out: Verse[] = [];
    let i = 0;
    for (const round of data.transcript) {
      for (const turn of round.turns) {
        out.push({ index: i, round: round.round, rapper: turn.rapper, bars: turn.bars });
        i += 1;
      }
    }
    return out;
  }, [data]);

  // Liste à plat des lignes du transcript, pour le fallback sans timings.
  const flatBars = useMemo<PlayPos[]>(
    () => verses.flatMap((v) => v.bars.map((_, barIndex) => ({ verseIndex: v.index, barIndex }))),
    [verses],
  );

  const track = data?.track ?? null;
  const timings = track?.timings ?? null;
  const hasAudio = track !== null;
  const currentVerse = verses[pos.verseIndex];
  const lineIndex = pos.barIndex;
  const activeSide: Side = currentVerse?.rapper ?? 'A';
  const totalRounds = data ? data.transcript.length : 0;

  // Lignes affichées pour le couplet courant : celles de Lyria si on a les
  // timings (texte + temps alignés → pas de décalage), sinon le transcript.
  const displayLines = useMemo<{ text: string; barIndex: number }[]>(() => {
    if (timings && timings.length > 0) {
      return timings
        .filter((t) => t.verseIndex === pos.verseIndex)
        .map((t) => ({ text: t.text, barIndex: t.barIndex }));
    }
    return (currentVerse?.bars ?? []).map((text, barIndex) => ({ text, barIndex }));
  }, [timings, pos.verseIndex, currentVerse]);

  // Charge la piste (une seule fois) dans l'élément audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.url;
    audio.load();
  }, [track]);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nowMs = audio.currentTime * 1000;

    if (timings && timings.length > 0) {
      // Synchro réelle : dernière ligne dont le début est passé.
      let tb = timings[0];
      for (const candidate of timings) {
        if (candidate.startMs <= nowMs) tb = candidate;
        else break;
      }
      if (!tb) return;
      const next = { verseIndex: tb.verseIndex, barIndex: tb.barIndex };
      setPos((p) =>
        p.verseIndex === next.verseIndex && p.barIndex === next.barIndex ? p : next,
      );
      return;
    }

    // Fallback sans timings : progression proportionnelle sur toutes les lignes.
    if (!audio.duration || Number.isNaN(audio.duration) || flatBars.length === 0) return;
    const ratio = audio.currentTime / audio.duration;
    const idx = Math.min(flatBars.length - 1, Math.max(0, Math.floor(ratio * flatBars.length)));
    const fb = flatBars[idx];
    if (!fb) return;
    setPos((p) => (p.verseIndex === fb.verseIndex && p.barIndex === fb.barIndex ? p : fb));
  }, [timings, flatBars]);

  const onEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    setStarted(true);
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      void audio.play().catch(() => setPlaying(false));
    }
  }, [playing, hasAudio]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    setPos({ verseIndex: 0, barIndex: 0 });
    if (audio) audio.currentTime = 0;
  }, []);

  const download = useCallback(() => {
    if (!track) return;
    const a = document.createElement('a');
    a.href = `${track.url}?download=1`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [track]);

  if (error) return <div style={{ padding: 40 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 40, color: 'var(--muted)' }}>Chargement…</div>;

  const pct = (n: number): number => (tally.total > 0 ? Math.round((n / tally.total) * 100) : 0);
  const A = data.rappers.A;
  const B = data.rappers.B;

  return (
    <div className="pl-wrap">
      <PlayerStyles />
      <header className="pl-top">
        <div className="pl-brand">
          <span className="pl-logo">RC</span>
          <span>
            <span className="pl-league">HISTORIC BATTLE LEAGUE</span>
            <span className="pl-title">{data.title}</span>
          </span>
        </div>
        <div className="pl-meta">
          <span className="pl-round">
            ROUND {String(currentVerse?.round ?? 0).padStart(2, '0')} / {String(totalRounds).padStart(2, '0')}
          </span>
          <span className={`pl-live ${data.votingOpen ? 'on' : ''}`}>
            {data.votingOpen ? 'VOTE OUVERT' : 'VOTE FERMÉ'}
          </span>
        </div>
      </header>

      <section className="pl-arena">
        <RapperCard rapper={A} active={activeSide === 'A'} side="A" votes={tally.A} pct={pct(tally.A)} />

        <div className={`pl-stage ${activeSide === 'A' ? 'glowA' : 'glowB'}`}>
          {!started ? (
            <div className="pl-idle">
              <div className="pl-spk">🔊</div>
              <div className="pl-idle-t">Lance la battle.</div>
              <div className="pl-idle-s">
                {hasAudio ? 'Appuie sur Play pour démarrer.' : 'Audio pas encore généré pour cette battle.'}
              </div>
            </div>
          ) : (
            <div className="pl-bars">
              {displayLines.map((line) => (
                <p
                  key={line.barIndex}
                  className={`pl-bar ${line.barIndex < lineIndex ? 'past' : ''} ${line.barIndex === lineIndex ? 'cur' : ''}`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </div>

        <RapperCard rapper={B} active={activeSide === 'B'} side="B" votes={tally.B} pct={pct(tally.B)} />
      </section>

      <footer className="pl-foot">
        <button className="pl-play" onClick={togglePlay} disabled={!hasAudio} aria-label="Play/Pause">
          {playing ? '⏸' : '▶'}
        </button>
        <button className="pl-mini" onClick={restart} disabled={!hasAudio}>
          ↻
        </button>
        <div className="pl-now">
          <span className="pl-now-l">NOW PLAYING</span>
          <span className="pl-now-v">
            {started ? data.rappers[activeSide].name : 'Ready for battle'}
          </span>
        </div>
        <div className="pl-actions">
          <button className="pl-mini" onClick={download} disabled={!hasAudio} title="Télécharger l'audio">
            ⬇ Audio
          </button>
          <a className="pl-mini" href={`/b/${slug}/vote`}>
            Voter
          </a>
          {data.isAdmin ? (
            <a className="pl-mini" href={`/b/${slug}/admin`}>
              Admin
            </a>
          ) : null}
        </div>
      </footer>

      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={onEnded} preload="auto" />
    </div>
  );
}

function RapperCard({
  rapper,
  active,
  side,
  votes,
  pct,
}: {
  rapper: RapperDTO;
  active: boolean;
  side: Side;
  votes: number;
  pct: number;
}): React.ReactElement {
  return (
    <div className={`pl-card ${side === 'A' ? 'a' : 'b'} ${active ? 'active' : ''}`}>
      <div className="pl-ava">{initials(rapper.name)}</div>
      <div className="pl-name">{rapper.name}</div>
      <div className="pl-role">
        {rapper.sex} · ~{rapper.age} ans
      </div>
      <div className="pl-score">
        <div className="pl-score-h">
          <span>VOTES</span>
          <span>
            {pct}% ({votes})
          </span>
        </div>
        <div className="pl-bar-track">
          <div className="pl-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function PlayerStyles(): React.ReactElement {
  return (
    <style>{`
      .pl-wrap{min-height:100vh;display:flex;flex-direction:column;}
      .pl-top{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--line);}
      .pl-brand{display:flex;align-items:center;gap:12px;}
      .pl-logo{background:var(--b);color:#fff;font-weight:800;border-radius:8px;padding:6px 9px;font-size:14px;}
      .pl-league{display:block;font-size:11px;letter-spacing:.16em;color:var(--muted);font-weight:700;}
      .pl-title{display:block;font-style:italic;font-weight:700;font-size:18px;}
      .pl-meta{display:flex;align-items:center;gap:10px;}
      .pl-round{border:1px solid var(--line);border-radius:100px;padding:7px 14px;font-size:12px;font-weight:700;letter-spacing:.05em;}
      .pl-live{border-radius:100px;padding:7px 14px;font-size:11px;font-weight:800;background:#2a2a33;color:var(--muted);letter-spacing:.05em;}
      .pl-live.on{background:var(--b);color:#fff;}
      .pl-arena{flex:1;display:grid;grid-template-columns:1fr 1.7fr 1fr;gap:18px;align-items:stretch;padding:26px 22px;}
      .pl-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:26px 18px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;transition:all .3s ease;opacity:.65;}
      .pl-card.active{opacity:1;}
      .pl-card.a.active{box-shadow:0 0 0 1px var(--a),0 0 40px rgba(59,130,246,.35);}
      .pl-card.b.active{box-shadow:0 0 0 1px var(--b),0 0 40px rgba(239,68,68,.35);}
      .pl-ava{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;font-style:italic;}
      .pl-card.a .pl-ava{background:radial-gradient(circle at 50% 35%,#1b2b54,#0b1430);border:2px solid var(--a);color:#cdddff;}
      .pl-card.b .pl-ava{background:radial-gradient(circle at 50% 35%,#4a1722,#2a0b10);border:2px solid var(--b);color:#ffd5d5;}
      .pl-name{font-size:20px;font-weight:800;}
      .pl-card.a .pl-name{color:#7fb0ff;}
      .pl-card.b .pl-name{color:#ff8a8a;}
      .pl-role{font-size:12px;color:var(--muted);text-transform:capitalize;}
      .pl-score{width:100%;margin-top:auto;}
      .pl-score-h{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-weight:700;margin-bottom:6px;letter-spacing:.05em;}
      .pl-bar-track{height:6px;background:#23232c;border-radius:100px;overflow:hidden;}
      .pl-bar-fill{height:100%;border-radius:100px;transition:width .5s ease;}
      .pl-card.a .pl-bar-fill{background:var(--a);}
      .pl-card.b .pl-bar-fill{background:var(--b);}
      .pl-stage{background:#0c0c12;border:1px solid var(--line);border-radius:20px;display:flex;align-items:center;justify-content:center;padding:30px;transition:box-shadow .4s ease;}
      .pl-stage.glowA{box-shadow:inset 0 0 120px rgba(59,130,246,.10);}
      .pl-stage.glowB{box-shadow:inset 0 0 120px rgba(239,68,68,.10);}
      .pl-idle{text-align:center;color:var(--muted);}
      .pl-spk{font-size:34px;opacity:.7;}
      .pl-idle-t{font-style:italic;font-size:26px;color:var(--ink);margin-top:10px;}
      .pl-idle-s{font-size:13px;margin-top:6px;}
      .pl-bars{display:flex;flex-direction:column;gap:10px;}
      .pl-bar{margin:0;font-size:20px;line-height:1.45;font-weight:600;color:rgba(255,255,255,.22);transition:color .3s ease;}
      .pl-bar.past{color:rgba(255,255,255,.6);}
      .pl-bar.cur{color:#fff;}
      .pl-foot{display:flex;align-items:center;gap:14px;padding:16px 22px;border-top:1px solid var(--line);}
      .pl-play{width:54px;height:54px;border-radius:50%;border:none;background:#fff;color:#08080c;font-size:20px;cursor:pointer;}
      .pl-play:disabled{opacity:.4;cursor:default;}
      .pl-mini{background:var(--panel-2);border:1px solid var(--line);color:var(--ink);border-radius:100px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;}
      .pl-mini:disabled{opacity:.4;cursor:default;}
      .pl-now{margin-left:6px;display:flex;flex-direction:column;}
      .pl-now-l{font-size:10px;color:var(--muted);letter-spacing:.12em;font-weight:700;}
      .pl-now-v{font-weight:700;}
      .pl-actions{margin-left:auto;display:flex;gap:10px;}
      @media(max-width:820px){.pl-arena{grid-template-columns:1fr;}}
    `}</style>
  );
}
