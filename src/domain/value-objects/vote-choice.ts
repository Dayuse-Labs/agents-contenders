import type { RapperSide } from './rapper';

/** On vote pour le rappeur A ou le rappeur B. */
export type VoteChoice = RapperSide;

export const isVoteChoice = (value: unknown): value is VoteChoice =>
  value === 'A' || value === 'B';
