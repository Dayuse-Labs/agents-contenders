import { describe, it, expect } from 'vitest';
import type { VerseRef } from '@/domain/entities/battle';
import { matchBars } from './match-bars';

const verses: VerseRef[] = [
  { index: 0, round: 1, rapper: 'A', bars: ['le chat noir dort', 'la lune brille fort'] },
  { index: 1, round: 1, rapper: 'B', bars: ['le chien court vite', 'sur la route grise'] },
];

describe('matchBars', () => {
  it('émet une entrée par ligne Lyria, attribuée au bon couplet/rappeur', () => {
    const timings = matchBars(verses, [
      { startSec: 1, text: 'le chat noir dort' },
      { startSec: 3, text: 'la lune brille fort' },
      { startSec: 5, text: 'le chien court vite' },
      { startSec: 7, text: 'sur la route grise' },
    ]);
    expect(timings.map((t) => t.verseIndex)).toEqual([0, 0, 1, 1]);
    expect(timings.map((t) => t.rapper)).toEqual(['A', 'A', 'B', 'B']);
    expect(timings.map((t) => t.barIndex)).toEqual([0, 1, 0, 1]);
    expect(timings.map((t) => t.startMs)).toEqual([1000, 3000, 5000, 7000]);
  });

  it('affiche le texte DE LYRIA, pas celui du transcript', () => {
    const timings = matchBars(verses, [{ startSec: 0, text: 'le chat tout noir qui dort encore' }]);
    expect(timings[0]?.text).toBe('le chat tout noir qui dort encore');
    expect(timings[0]?.verseIndex).toBe(0); // attribué malgré la reformulation
    expect(timings[0]?.rapper).toBe('A');
  });

  it('attribue une ligne reformulée au-dessus du seuil de similarité', () => {
    const timings = matchBars(verses, [
      { startSec: 1, text: 'le chat noir dort' },
      { startSec: 3, text: 'la lune elle brille très fort ce soir' },
    ]);
    expect(timings[1]?.verseIndex).toBe(0);
  });

  it('fait hériter une ligne sans correspondance (ad-lib, outro) de la précédente', () => {
    const timings = matchBars(verses, [
      { startSec: 1, text: 'le chien court vite' }, // → v1 B
      { startSec: 3, text: 'yeah yeah ouais' }, // aucun mot commun → hérite v1 B
    ]);
    expect(timings[1]).toMatchObject({ verseIndex: 1, rapper: 'B' });
  });

  it('produit des startMs strictement croissants même à temps égaux', () => {
    const timings = matchBars(verses, [
      { startSec: 5, text: 'le chat noir dort' },
      { startSec: 5, text: 'la lune brille fort' },
    ]);
    expect(timings[1]?.startMs).toBeGreaterThan(timings[0]?.startMs ?? Infinity);
  });

  it('renvoie [] sans ligne exploitable ou sans transcript', () => {
    expect(matchBars(verses, [])).toEqual([]);
    expect(matchBars(verses, [{ startSec: null, text: 'x' }])).toEqual([]);
    expect(matchBars([], [{ startSec: 0, text: 'x' }])).toEqual([]);
  });
});
