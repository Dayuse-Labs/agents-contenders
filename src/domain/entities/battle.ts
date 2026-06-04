import type { Rapper, RapperSide } from '../value-objects/rapper';

export interface Turn {
  readonly rapper: RapperSide;
  readonly bars: readonly string[];
}

export interface Round {
  readonly round: number;
  readonly turns: readonly Turn[];
}

export type Transcript = readonly Round[];

export type BattleStatus = 'DRAFT' | 'LIVE' | 'CLOSED';

export interface VerseRef {
  readonly index: number;
  readonly round: number;
  readonly rapper: RapperSide;
  readonly bars: readonly string[];
}

/** Une battle : deux rappeurs, un transcript, un statut et une fenêtre de vote. */
export class Battle {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly title: string,
    public readonly rapperA: Rapper,
    public readonly rapperB: Rapper,
    public readonly transcript: Transcript,
    public readonly status: BattleStatus,
    public readonly voteClosesAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  /** Le vote est-il ouvert à l'instant `now` ? (LIVE, et avant la clôture éventuelle +5 min) */
  isVotingOpen(now: Date = new Date()): boolean {
    if (this.status === 'DRAFT' || this.status === 'CLOSED') return false;
    if (this.voteClosesAt === null) return true;
    return now.getTime() <= this.voteClosesAt.getTime();
  }

  rapperBySide(side: RapperSide): Rapper {
    return side === 'A' ? this.rapperA : this.rapperB;
  }

  /** Séquence à plat des couplets, dans l'ordre de lecture. */
  verseSequence(): readonly VerseRef[] {
    const seq: VerseRef[] = [];
    let index = 0;
    for (const round of this.transcript) {
      for (const turn of round.turns) {
        seq.push({ index, round: round.round, rapper: turn.rapper, bars: turn.bars });
        index += 1;
      }
    }
    return seq;
  }

  /** Démarre la battle : vote ouvert, sans clôture programmée. */
  start(): Battle {
    return new Battle(this.id, this.slug, this.title, this.rapperA, this.rapperB, this.transcript, 'LIVE', null, this.createdAt);
  }

  /** Programme la clôture du vote dans `graceMs` (ex. 5 min après la fin de la battle). */
  closeWithGrace(now: Date, graceMs: number): Battle {
    const closesAt = new Date(now.getTime() + graceMs);
    return new Battle(this.id, this.slug, this.title, this.rapperA, this.rapperB, this.transcript, 'LIVE', closesAt, this.createdAt);
  }

  /** Clôture définitive : plus aucun vote possible. */
  finalize(): Battle {
    return new Battle(this.id, this.slug, this.title, this.rapperA, this.rapperB, this.transcript, 'CLOSED', this.voteClosesAt, this.createdAt);
  }
}
