import type { Vote } from '../entities/vote';

export interface VoteTally {
  readonly A: number;
  readonly B: number;
  readonly total: number;
}

export interface VoteRepository {
  findByBattleAndVoter(battleId: string, voterHash: string): Promise<Vote | null>;
  /** Crée ou met à jour le vote (un seul par personne et par battle). */
  upsert(vote: Vote): Promise<void>;
  tally(battleId: string): Promise<VoteTally>;
}
