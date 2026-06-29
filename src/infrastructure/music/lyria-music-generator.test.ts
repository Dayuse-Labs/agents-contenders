import { describe, it, expect } from 'vitest';
import { buildPrompt } from './lyria-music-generator';

describe('buildPrompt', () => {
  const request = {
    voices: {
      A: { sex: 'masculin' as const, age: 46 },
      B: { sex: 'féminin' as const, age: 50 },
    },
    verses: [
      { rapper: 'A' as const, bars: ['ligne a1', 'ligne a2'] },
      { rapper: 'B' as const, bars: ['ligne b1'] },
    ],
  };

  it('décrit un morceau continu avec les deux voix (sexe + âge)', () => {
    const prompt = buildPrompt(request);
    expect(prompt).toContain('ONE continuous song');
    expect(prompt).toContain('a male voice sounding about 46 years old');
    expect(prompt).toContain('a female voice sounding about 50 years old');
  });

  it('tague chaque couplet avec sa voix exacte (sexe+âge), sans label Rapper A/B', () => {
    const prompt = buildPrompt(request);
    const tags = prompt.match(/\[Verse - [^\]]+\]/g);
    expect(tags).toEqual([
      '[Verse - a male voice sounding about 46 years old]',
      '[Verse - a female voice sounding about 50 years old]',
    ]);
    expect(prompt).toContain('[Verse - a male voice sounding about 46 years old]\nligne a1\nligne a2');
    // Le label « Rapper A/B » (non reconnu par Lyria) ne doit plus apparaître.
    expect(prompt).not.toContain('Rapper A');
    expect(prompt).not.toContain('Rapper B');
  });

  it('lie la voix au couplet même quand B ouvre la battle (cas buzz-vs-celine)', () => {
    const prompt = buildPrompt({
      voices: { A: { sex: 'masculin', age: 30 }, B: { sex: 'féminin', age: 50 } },
      verses: [
        { rapper: 'B', bars: ['ouverture de la diva'] },
        { rapper: 'A', bars: ['réponse'] },
      ],
    });
    const tags = prompt.match(/\[Verse - [^\]]+\]/g);
    // 1er couplet = voix féminine (B ouvre), 2e = voix masculine : plus de voix inversées.
    expect(tags?.[0]).toBe('[Verse - a female voice sounding about 50 years old]');
    expect(tags?.[1]).toBe('[Verse - a male voice sounding about 30 years old]');
  });
});
