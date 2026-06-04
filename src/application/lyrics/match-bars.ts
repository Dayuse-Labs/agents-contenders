import { z } from 'zod';
import type { VerseRef } from '@/domain/entities/battle';
import type { TimedBar } from '@/domain/entities/audio-segment';
import type { ParsedLine } from './parse-timed-lyrics';

/** Schéma de validation des timings relus depuis la base (colonne Json). */
export const TimedBarSchema: z.ZodType<TimedBar> = z.object({
  verseIndex: z.number().int().nonnegative(),
  rapper: z.enum(['A', 'B']),
  barIndex: z.number().int().nonnegative(),
  text: z.string(),
  startMs: z.number().nonnegative(),
});

export const TimedBarsSchema = z.array(TimedBarSchema);

/** Normalise pour comparaison floue : minuscules, sans accents ni ponctuation. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similarité de Jaccard sur les mots (0 = rien en commun, 1 = identiques). */
function similarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(' ').filter(Boolean));
  const setB = new Set(normalize(b).split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const word of setA) if (setB.has(word)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}

const MATCH_WINDOW = 8; // fenêtre de recherche en avant (lignes restantes du transcript)
const MATCH_THRESHOLD = 0.3; // similarité minimale pour considérer une correspondance

/**
 * Construit les paroles horodatées à afficher dans le player : UNE entrée par
 * ligne chantée par Lyria (son texte + son temps), attribuée au bon couplet /
 * rappeur par correspondance floue avec le transcript (Lyria peut reformuler,
 * ajouter ou retirer des lignes). On suit un curseur qui n'avance que vers
 * l'avant : les lignes arrivent dans l'ordre du morceau.
 *
 * On affiche le texte DE LYRIA (et non le transcript) pour que surlignage et
 * audio restent toujours alignés. Une ligne sans correspondance (ad-lib, outro)
 * hérite de l'attribution de la précédente. Renvoie [] si rien d'exploitable.
 */
export function matchBars(verses: readonly VerseRef[], lines: readonly ParsedLine[]): TimedBar[] {
  const usable = lines.filter((l) => l.startSec !== null);
  if (usable.length === 0) return [];

  const flat = verses.flatMap((v) => v.bars.map((text) => ({ verseIndex: v.index, rapper: v.rapper, text })));
  const first = flat[0];
  if (!first) return [];

  let cursor = 0;
  let attr = { verseIndex: first.verseIndex, rapper: first.rapper };
  const barCount = new Map<number, number>();
  let prevMs = -1;
  const out: TimedBar[] = [];

  for (const line of usable) {
    let best = -1;
    let bestScore = 0;
    for (let j = cursor; j < Math.min(flat.length, cursor + MATCH_WINDOW); j += 1) {
      const candidate = flat[j];
      if (!candidate) continue;
      const score = similarity(line.text, candidate.text);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    const matched = best >= 0 && bestScore >= MATCH_THRESHOLD ? flat[best] : undefined;
    if (matched) {
      attr = { verseIndex: matched.verseIndex, rapper: matched.rapper };
      cursor = best + 1;
    }

    const barIndex = barCount.get(attr.verseIndex) ?? 0;
    barCount.set(attr.verseIndex, barIndex + 1);
    // startMs strictement croissant : deux lignes ne partagent jamais le même temps.
    const startMs = Math.max(prevMs + 1, Math.round((line.startSec ?? 0) * 1000));
    prevMs = startMs;
    out.push({ verseIndex: attr.verseIndex, rapper: attr.rapper, barIndex, text: line.text, startMs });
  }
  return out;
}
