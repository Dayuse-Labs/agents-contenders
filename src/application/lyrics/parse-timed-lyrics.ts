/**
 * Parseur du texte de paroles horodatées renvoyé par Lyria 3 à côté de l'audio.
 * Format observé (timestamps épars) :
 *
 *   [[A0]]
 *   [[B1]]
 *   [10.6:] Mon flow est relatif mais ma victoire est absolue,
 *   [:] J'ai l'expérience d'un vieux loup dans la rue,
 *   [[C2]]
 *   [42.6:] C'est le poids des mots, c'est la fin du combat,
 *
 * `[[..]]` = marqueur de section (ignoré : seules les lignes et leurs temps
 * nous intéressent), `[N.N:]` = début explicite en secondes, `[:]` = ligne de
 * continuation sans temps explicite.
 */

export interface ParsedLine {
  readonly startSec: number | null;
  readonly text: string;
}

const SECTION_MARKER = /^\[\[[^\]]*\]\]$/;
const TIMED_LINE = /^\[(\d+(?:\.\d+)?)?:\]\s*(.*)$/;

/** Extrait les lignes chantées (avec leur temps de début quand il est présent). */
export function parseTimedLyrics(raw: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || SECTION_MARKER.test(line)) continue;
    const match = TIMED_LINE.exec(line);
    if (!match) continue;
    const text = (match[2] ?? '').replace(/,\s*$/, '').trim();
    if (text.length === 0) continue;
    lines.push({ startSec: match[1] !== undefined ? Number(match[1]) : null, text });
  }
  return lines;
}

/** Incrément par défaut quand il n'y a plus d'ancre après une ligne (≈ une mesure). */
const FALLBACK_LINE_SEC = 3;

/**
 * Durée maximale attribuée à une ligne entre deux ancres. Au-delà (typiquement
 * un break instrumental entre deux couplets), inutile d'étirer chaque ligne sur
 * le silence : on avance à ce rythme puis la dernière ligne « tient » jusqu'au
 * couplet suivant. En deçà, l'interpolation linéaire reste inchangée.
 */
const MAX_LINE_SEC = 5;

/**
 * Remplit les temps manquants par interpolation linéaire entre les ancres
 * explicites, avec un plafond par ligne (cf. MAX_LINE_SEC). Avant la première
 * ancre : répartition depuis 0 ; après la dernière : incrément fixe. Renvoie []
 * s'il n'y a aucune ancre (inutilisable).
 */
export function fillStartTimes(lines: readonly ParsedLine[]): ParsedLine[] {
  const times = new Array<number>(lines.length);
  const anchorIdx: number[] = [];
  lines.forEach((l, i) => {
    if (l.startSec !== null) {
      times[i] = l.startSec;
      anchorIdx.push(i);
    }
  });
  if (anchorIdx.length === 0) return [];

  // Lignes avant la première ancre : réparties linéairement depuis 0.
  const firstI = anchorIdx[0] ?? 0;
  const firstT = times[firstI] ?? 0;
  for (let i = 0; i < firstI; i += 1) {
    times[i] = (firstT * i) / firstI;
  }
  // Entre deux ancres consécutives : interpolation linéaire, plafonnée par ligne.
  for (let a = 0; a + 1 < anchorIdx.length; a += 1) {
    const i0 = anchorIdx[a] ?? 0;
    const i1 = anchorIdx[a + 1] ?? 0;
    const t0 = times[i0] ?? 0;
    const t1 = times[i1] ?? 0;
    const step = Math.min((t1 - t0) / (i1 - i0), MAX_LINE_SEC);
    for (let i = i0 + 1; i < i1; i += 1) {
      times[i] = t0 + step * (i - i0);
    }
  }
  // Après la dernière ancre : incrément fixe.
  const lastI = anchorIdx[anchorIdx.length - 1] ?? 0;
  const lastT = times[lastI] ?? 0;
  for (let i = lastI + 1; i < lines.length; i += 1) {
    times[i] = lastT + (i - lastI) * FALLBACK_LINE_SEC;
  }
  return lines.map((l, i) => ({ text: l.text, startSec: times[i] ?? 0 }));
}
