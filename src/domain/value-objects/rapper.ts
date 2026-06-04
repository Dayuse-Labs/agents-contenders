/** Sexe à représenter pour la voix (valeurs alignées sur le JSON des battles). */
export type Sex = 'féminin' | 'masculin';

/** Côté du rappeur dans la battle. */
export type RapperSide = 'A' | 'B';

/** Un rappeur = une vraie personnalité publique incarnée par un subagent. */
export interface Rapper {
  readonly side: RapperSide;
  readonly name: string; // vraie personnalité, ex. "Ada Lovelace"
  readonly agent: string; // identifiant du subagent, ex. "ada-lovelace"
  readonly sex: Sex; // pour la voix
  readonly age: number; // âge à représenter, pour la voix
}

export const isFemale = (rapper: Rapper): boolean => rapper.sex === 'féminin';
