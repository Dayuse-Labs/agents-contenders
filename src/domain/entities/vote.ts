import type { VoteChoice } from '../value-objects/vote-choice';

/**
 * Un vote. On ne stocke jamais l'email en clair : `voterHash` = sha256(email + sel).
 * Minimisation RGPD : aucune autre donnée personnelle n'est conservée.
 */
export class Vote {
  constructor(
    public readonly id: string,
    public readonly battleId: string,
    public readonly voterHash: string,
    public readonly choice: VoteChoice,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  withChoice(choice: VoteChoice, now: Date = new Date()): Vote {
    return new Vote(this.id, this.battleId, this.voterHash, choice, this.createdAt, now);
  }
}
