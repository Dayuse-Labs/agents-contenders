import { describe, it, expect } from 'vitest';
import { Battle, type BattleStatus, type Transcript } from './battle';
import type { Rapper } from '@/domain/value-objects/rapper';

const rA: Rapper = { side: 'A', name: 'Ada', agent: 'ada', sex: 'féminin', age: 30 };
const rB: Rapper = { side: 'B', name: 'Babbage', agent: 'babbage', sex: 'masculin', age: 50 };
const transcript: Transcript = [
  { round: 1, turns: [{ rapper: 'A', bars: ['x', 'y'] }, { rapper: 'B', bars: ['z'] }] },
];

const make = (status: BattleStatus, closesAt: Date | null = null): Battle =>
  new Battle('id', 'slug', 'Ada vs Babbage', rA, rB, transcript, status, closesAt, new Date());

describe('Battle.isVotingOpen', () => {
  it('est fermé en DRAFT et CLOSED', () => {
    expect(make('DRAFT').isVotingOpen()).toBe(false);
    expect(make('CLOSED').isVotingOpen()).toBe(false);
  });
  it('est ouvert en LIVE sans clôture programmée', () => {
    expect(make('LIVE').isVotingOpen()).toBe(true);
  });
  it('respecte voteClosesAt', () => {
    expect(make('LIVE', new Date(Date.now() + 1000)).isVotingOpen()).toBe(true);
    expect(make('LIVE', new Date(Date.now() - 1000)).isVotingOpen()).toBe(false);
  });
});

describe('Battle.verseSequence', () => {
  it('aplatit les couplets dans l’ordre', () => {
    const seq = make('LIVE').verseSequence();
    expect(seq.length).toBe(2);
    expect(seq[0]?.rapper).toBe('A');
    expect(seq[1]?.rapper).toBe('B');
    expect(seq[0]?.index).toBe(0);
  });
});

describe('Battle transitions', () => {
  it('start ouvre le vote, finalize le ferme', () => {
    const b = make('DRAFT');
    expect(b.start().status).toBe('LIVE');
    expect(b.finalize().status).toBe('CLOSED');
  });
  it('closeWithGrace programme une clôture future', () => {
    const closed = make('LIVE').closeWithGrace(new Date(), 5 * 60 * 1000);
    expect(closed.voteClosesAt).not.toBeNull();
    expect(closed.isVotingOpen()).toBe(true);
  });
});
