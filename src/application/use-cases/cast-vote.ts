import { type Result, ok, err } from '@/shared/result';
import type { Battle } from '@/domain/entities/battle';
import { Vote } from '@/domain/entities/vote';
import type { VoteChoice } from '@/domain/value-objects/vote-choice';
import type { VoteRepository } from '@/domain/repositories/vote-repository';

export class VotingClosedError extends Error {
  constructor() {
    super('Le vote est fermé pour cette battle.');
    this.name = 'VotingClosedError';
  }
}

export interface CastVoteInput {
  readonly battle: Battle;
  readonly voterHash: string; // sha256(email + sel) — jamais l'email en clair
  readonly choice: VoteChoice;
  readonly newId: () => string;
  readonly now?: Date;
}

/**
 * Enregistre ou met à jour le vote d'une personne pour une battle.
 * Règle : un seul vote par personne, modifiable tant que le vote est ouvert
 * (battle LIVE, jusqu'à la clôture + 5 min gérée via Battle.voteClosesAt).
 */
export class CastVote {
  constructor(private readonly votes: VoteRepository) {}

  async execute(input: CastVoteInput): Promise<Result<Vote, VotingClosedError>> {
    const now = input.now ?? new Date();
    if (!input.battle.isVotingOpen(now)) {
      return err(new VotingClosedError());
    }
    const existing = await this.votes.findByBattleAndVoter(input.battle.id, input.voterHash);
    const vote = existing
      ? existing.withChoice(input.choice, now)
      : new Vote(input.newId(), input.battle.id, input.voterHash, input.choice, now, now);
    await this.votes.upsert(vote);
    return ok(vote);
  }
}
