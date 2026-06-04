import type { PrismaClient } from '@prisma/client';
import { Vote } from '@/domain/entities/vote';
import { isVoteChoice, type VoteChoice } from '@/domain/value-objects/vote-choice';
import type { VoteRepository, VoteTally } from '@/domain/repositories/vote-repository';

interface VoteRow {
  id: string;
  battleId: string;
  voterHash: string;
  choice: string;
  createdAt: Date;
  updatedAt: Date;
}

function toDomain(row: VoteRow): Vote {
  const choice: VoteChoice = isVoteChoice(row.choice) ? row.choice : 'A';
  return new Vote(row.id, row.battleId, row.voterHash, choice, row.createdAt, row.updatedAt);
}

export class PrismaVoteRepository implements VoteRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByBattleAndVoter(battleId: string, voterHash: string): Promise<Vote | null> {
    const row = await this.db.vote.findUnique({
      where: { battleId_voterHash: { battleId, voterHash } },
    });
    return row ? toDomain(row) : null;
  }

  async upsert(vote: Vote): Promise<void> {
    await this.db.vote.upsert({
      where: { battleId_voterHash: { battleId: vote.battleId, voterHash: vote.voterHash } },
      create: {
        id: vote.id,
        battleId: vote.battleId,
        voterHash: vote.voterHash,
        choice: vote.choice,
      },
      update: { choice: vote.choice },
    });
  }

  async tally(battleId: string): Promise<VoteTally> {
    const grouped = await this.db.vote.groupBy({
      by: ['choice'],
      where: { battleId },
      _count: { _all: true },
    });
    let a = 0;
    let b = 0;
    for (const group of grouped) {
      if (group.choice === 'A') a = group._count._all;
      else if (group.choice === 'B') b = group._count._all;
    }
    return { A: a, B: b, total: a + b };
  }
}
