import type { Result } from '@/shared/result';
import type { Sex, RapperSide } from '@/domain/value-objects/rapper';

/**
 * Description d'une voix — volontairement SANS nom : un nom de personnalité
 * dans le prompt déclenche la protection anti-imitation de Lyria
 * (PROHIBITED_CONTENT). Le retirer du type rend la fuite impossible.
 */
export interface VoiceSpec {
  readonly sex: Sex;
  readonly age: number;
}

export interface TrackVerse {
  readonly rapper: RapperSide;
  readonly bars: readonly string[];
}

/** La battle entière : deux voix qui alternent sur UN morceau continu. */
export interface TrackRequest {
  readonly voices: { readonly A: VoiceSpec; readonly B: VoiceSpec };
  readonly verses: readonly TrackVerse[];
  readonly styleHint?: string;
}

export interface GeneratedTrack {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly timedLyricsText: string; // paroles horodatées renvoyées par Lyria (pour la synchro)
}

export class MusicGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MusicGenerationError';
  }
}

/** Port : génère la piste complète d'une battle (un seul morceau, deux voix). */
export interface MusicGenerator {
  generateTrack(request: TrackRequest): Promise<Result<GeneratedTrack, MusicGenerationError>>;
}
