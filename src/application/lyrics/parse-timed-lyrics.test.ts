import { describe, it, expect } from 'vitest';
import { parseTimedLyrics, fillStartTimes } from './parse-timed-lyrics';

const SAMPLE = [
  '[[A0]]',
  '[[B1]]',
  '[10.6:] Mon flow est relatif mais ma victoire est absolue,',
  "[:] J'ai l'expérience d'un vieux loup dans la rue,",
  '[:] Tes rimes sont légères, on les a jamais lues,',
  '[[C2]]',
  "[42.6:] C'est le poids des mots, c'est la fin du combat,",
  '[:] Le vieux lion rugit, le gamin s’en va.',
].join('\n');

describe('parseTimedLyrics', () => {
  it('extrait les lignes avec leur temps explicite ou null', () => {
    const lines = parseTimedLyrics(SAMPLE);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toEqual({
      startSec: 10.6,
      text: 'Mon flow est relatif mais ma victoire est absolue',
    });
    expect(lines[1]?.startSec).toBeNull();
    expect(lines[3]?.startSec).toBe(42.6);
  });

  it('ignore les marqueurs de section et les lignes vides', () => {
    const lines = parseTimedLyrics('[[A0]]\n\n[[B1]]\n[5:] Texte');
    expect(lines).toEqual([{ startSec: 5, text: 'Texte' }]);
  });

  it('strippe la virgule finale', () => {
    const lines = parseTimedLyrics('[1.5:] Une ligne,');
    expect(lines[0]?.text).toBe('Une ligne');
  });

  it("renvoie [] pour une entrée vide ou sans format reconnu", () => {
    expect(parseTimedLyrics('')).toEqual([]);
    expect(parseTimedLyrics('du texte sans aucun marqueur')).toEqual([]);
  });
});

describe('fillStartTimes', () => {
  it('interpole linéairement entre deux ancres (pas sous le plafond)', () => {
    const filled = fillStartTimes([
      { startSec: 10, text: 'a' },
      { startSec: null, text: 'b' },
      { startSec: null, text: 'c' },
      { startSec: 19, text: 'd' },
    ]);
    expect(filled.map((l) => l.startSec)).toEqual([10, 13, 16, 19]);
  });

  it('plafonne le pas par ligne sur un gap (break instrumental)', () => {
    // step linéaire = (46-10)/6 = 6s > plafond (5s) → on avance de 5s puis on
    // saute à l'ancre suivante.
    const filled = fillStartTimes([
      { startSec: 10, text: 'a' },
      { startSec: null, text: 'b' },
      { startSec: null, text: 'c' },
      { startSec: null, text: 'd' },
      { startSec: null, text: 'e' },
      { startSec: null, text: 'f' },
      { startSec: 46, text: 'g' },
    ]);
    expect(filled.map((l) => l.startSec)).toEqual([10, 15, 20, 25, 30, 35, 46]);
  });

  it('répartit les lignes avant la première ancre depuis 0', () => {
    const filled = fillStartTimes([
      { startSec: null, text: 'a' },
      { startSec: null, text: 'b' },
      { startSec: 10, text: 'c' },
    ]);
    expect(filled.map((l) => l.startSec)).toEqual([0, 5, 10]);
  });

  it('incrémente après la dernière ancre', () => {
    const filled = fillStartTimes([
      { startSec: 10, text: 'a' },
      { startSec: null, text: 'b' },
      { startSec: null, text: 'c' },
    ]);
    expect(filled.map((l) => l.startSec)).toEqual([10, 13, 16]);
  });

  it('renvoie [] sans aucune ancre', () => {
    expect(fillStartTimes([{ startSec: null, text: 'a' }])).toEqual([]);
  });

  it('produit des temps croissants sur le format Lyria observé', () => {
    const filled = fillStartTimes(parseTimedLyrics(SAMPLE));
    const times = filled.map((l) => l.startSec ?? -1);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeGreaterThan(times[i - 1] ?? Infinity);
    }
  });
});
