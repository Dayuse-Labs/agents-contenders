import { describe, it, expect } from 'vitest';
import { parseImportBattle } from './battle-schemas';

const valid = {
  battleId: 'ada-vs-babbage',
  rappers: [
    { id: 'A', name: 'Ada Lovelace', agent: 'ada-lovelace', sex: 'féminin', age: 30 },
    { id: 'B', name: 'Charles Babbage', agent: 'charles-babbage', sex: 'masculin', age: 50 },
  ],
  rounds: [{ round: 1, turns: [{ rapper: 'A', bars: ['x'] }, { rapper: 'B', bars: ['y'] }] }],
};

describe('parseImportBattle', () => {
  it('valide un transcript correct et mappe A/B', () => {
    const result = parseImportBattle(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rapperA.name).toBe('Ada Lovelace');
      expect(result.data.rapperB.side).toBe('B');
      expect(result.data.title).toContain('Ada Lovelace');
    }
  });

  it('rejette un slug non kebab-case', () => {
    expect(parseImportBattle({ ...valid, battleId: 'Ada Vs Babbage' }).success).toBe(false);
  });

  it('rejette quand A et B ne sont pas tous deux présents', () => {
    const twoA = {
      ...valid,
      rappers: [
        { id: 'A', name: 'Ada', agent: 'ada', sex: 'féminin', age: 30 },
        { id: 'A', name: 'X', agent: 'x', sex: 'masculin', age: 40 },
      ],
    };
    expect(parseImportBattle(twoA).success).toBe(false);
  });

  it('rejette une entrée non objet', () => {
    expect(parseImportBattle('nope').success).toBe(false);
  });
});
