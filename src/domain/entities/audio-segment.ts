import type { RapperSide } from '../value-objects/rapper';

/** Une ligne chantée, horodatée sur la piste audio (pour la synchro du player). */
export interface TimedBar {
  readonly verseIndex: number; // couplet attribué (index dans battle.verseSequence())
  readonly rapper: RapperSide;
  readonly barIndex: number; // index de la ligne au sein du couplet
  readonly text: string; // texte CHANTÉ PAR LYRIA, affiché tel quel pour rester synchro
  readonly startMs: number; // début de la ligne sur la piste
}

/**
 * La piste audio d'une battle : UN morceau continu généré par Lyria avec les deux
 * voix qui alternent, plus les paroles horodatées (`timings`) pour la synchro.
 * Le fichier vit sur le volume Railway (jamais en base). Une seule piste par
 * battle (`turnIndex` fixé à 0).
 */
export interface AudioSegment {
  readonly id: string;
  readonly battleId: string;
  readonly turnIndex: number; // toujours 0 (une piste par battle)
  readonly rapper: RapperSide; // vestigial pour une piste complète ('A')
  readonly fileName: string; // nom de fichier sur le volume (aléatoire)
  readonly mimeType: string;
  readonly durationMs: number | null;
  readonly timings: readonly TimedBar[] | null; // null si le parsing Lyria a échoué
  readonly createdAt: Date;
}
