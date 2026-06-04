import { describe, it, expect } from 'vitest';
import { CastVote, VotingClosedError } from './cast-vote';
import { Battle, type BattleStatus } from '@/domain/entities/battle';
import { Vote } from '@/domain/entities/vote';
import type { VoteRepository, VoteTally } from '@/domain/repositories/vote-repository';
import type { Rapper } from '@/domain/value-objects/rapper';

const rapperA: Rapper = { side: 'A', name: 'Ada Lovelace', agent: 'ada-lovelace', sex: 'féminin', age: 30 };
const rapperB: Rapper = { side: 'B', name: 'Charles Babbage', agent: 'charles-babbage', sex: 'masculin', age: 50 };

function makeBattle(status: BattleStatus, voteClosesAt: Date | null = null): Battle {
  return new Battle('b1', 'ada-vs-babbage', 'Ada vs Babbage', rapperA, rapperB, [], status, voteClosesAt, new Date());
}

class FakeVoteRepo implements VoteRepository {
  readonly votes = new Map<string, Vote>();
  async findByBattleAndVoter(battleId: string, voterHash: string): Promise<Vote | null> {
    return this.votes.get(`${battleId}:${voterHash}`) ?? null;
  }
  async upsert(vote: Vote): Promise<void> {
    this.votes.set(`${vote.battleId}:${vote.voterHash}`, vote);
  }
  async tally(battleId: string): Promise<VoteTally> {
    let a = 0;
    let b = 0;
    for (const v of this.votes.values()) {
      if (v.battleId !== battleId) continue;
      if (v.choice === 'A') a += 1;
      else b += 1;
    }
    return { A: a, B: b, total: a + b };
  }
}

let counter = 0;
const newId = (): string => `v${(counter += 1)}`;

describe('CastVote', () => {
  it('refuse le vote si la battle est CLOSED', async () => {
    const repo = new FakeVoteRepo();
    const res = await new CastVote(repo).execute({ battle: makeBattle('CLOSED'), voterHash: 'h1', choice: 'A', newId });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBeInstanceOf(VotingClosedError);
  });

  it('enregistre un vote quand la battle est LIVE', async () => {
    const repo = new FakeVoteRepo();
    const res = await new CastVote(repo).execute({ battle: makeBattle('LIVE'), voterHash: 'h1', choice: 'A', newId });
    expect(res.success).toBe(true);
    expect((await repo.tally('b1')).A).toBe(1);
  });

  it('permet de changer son vote (un seul par personne)', async () => {
    const repo = new FakeVoteRepo();
    const uc = new CastVote(repo);
    const battle = makeBattle('LIVE');
    await uc.execute({ battle, voterHash: 'h1', choice: 'A', newId });
    await uc.execute({ battle, voterHash: 'h1', choice: 'B', newId });
    const tally = await repo.tally('b1');
    expect(tally).toEqual({ A: 0, B: 1, total: 1 });
  });

  it('refuse après la clôture (voteClosesAt dépassé)', async () => {
    const repo = new FakeVoteRepo();
    const past = new Date(Date.now() - 60_000);
    const res = await new CastVote(repo).execute({ battle: makeBattle('LIVE', past), voterHash: 'h1', choice: 'A', newId });
    expect(res.success).toBe(false);
  });

  it('accepte pendant les 5 min de rab (voteClosesAt à venir)', async () => {
    const repo = new FakeVoteRepo();
    const future = new Date(Date.now() + 5 * 60_000);
    const res = await new CastVote(repo).execute({ battle: makeBattle('LIVE', future), voterHash: 'h1', choice: 'A', newId });
    expect(res.success).toBe(true);
  });
});
