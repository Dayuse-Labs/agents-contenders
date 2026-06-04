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
    expect(prompt).toContain('Rapper A is a male voice sounding about 46 years old');
    expect(prompt).toContain('Rapper B is a female voice sounding about 50 years old');
  });

  it("émet un tag [Verse - Rapper X] par couplet, dans l'ordre", () => {
    const prompt = buildPrompt(request);
    const tags = prompt.match(/\[Verse - Rapper [AB]\]/g);
    expect(tags).toEqual(['[Verse - Rapper A]', '[Verse - Rapper B]']);
    expect(prompt).toContain('[Verse - Rapper A]\nligne a1\nligne a2');
  });
});
