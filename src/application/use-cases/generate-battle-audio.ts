import { type Result, ok, err } from '@/shared/result';
import type { Battle } from '@/domain/entities/battle';
import type { AudioSegment } from '@/domain/entities/audio-segment';
import type { MusicGenerator } from '@/application/ports/music-generator';
import type { AudioStorage } from '@/application/ports/audio-storage';
import type { AudioSegmentRepository } from '@/domain/repositories/audio-segment-repository';
import { parseTimedLyrics, fillStartTimes } from '@/application/lyrics/parse-timed-lyrics';
import { matchBars } from '@/application/lyrics/match-bars';
import { redactNames } from '@/application/lyrics/redact-names';

export interface GenerateBattleAudioDeps {
  readonly music: MusicGenerator;
  readonly storage: AudioStorage;
  readonly segments: AudioSegmentRepository;
  readonly newId: () => string;
}

/**
 * Génère la piste audio d'une battle : UN appel Lyria pour le morceau entier,
 * les deux voix alternant par couplet sur la même instru. Les paroles
 * horodatées renvoyées par Lyria sont parsées et mappées sur le transcript
 * (`timings`) pour la synchro du player. Relancer regénère toute la piste.
 */
export class GenerateBattleAudio {
  constructor(private readonly deps: GenerateBattleAudioDeps) {}

  async execute(battle: Battle): Promise<Result<AudioSegment, Error>> {
    const verses = battle.verseSequence();
    if (verses.length === 0) return err(new Error('Transcript vide.'));

    // Caviarde les noms réels des rappeurs avant Lyria (anti-PROHIBITED_CONTENT) :
    // pour chaque couplet, « moi » = celui qui chante, « toi » = l'adversaire. On
    // réutilise ces couplets caviardés pour la synchro (matchBars) afin que
    // l'attribution reste alignée sur ce que Lyria chante réellement.
    const sanitizedVerses = verses.map((v) => ({
      ...v,
      bars: redactNames(v.bars, {
        selfName: battle.rapperBySide(v.rapper).name,
        opponentName: battle.rapperBySide(v.rapper === 'A' ? 'B' : 'A').name,
      }),
    }));

    const generated = await this.deps.music.generateTrack({
      voices: {
        A: { sex: battle.rapperA.sex, age: battle.rapperA.age },
        B: { sex: battle.rapperB.sex, age: battle.rapperB.age },
      },
      verses: sanitizedVerses.map((v) => ({ rapper: v.rapper, bars: v.bars })),
    });
    if (!generated.success) return err(generated.error);

    const isMp3 =
      generated.data.mimeType.includes('mpeg') || generated.data.mimeType.includes('mp3');
    const fileName = `${battle.id}-track-${this.deps.newId()}.${isMp3 ? 'mp3' : 'wav'}`;

    const saved = await this.deps.storage.save(
      fileName,
      generated.data.bytes,
      generated.data.mimeType,
    );
    if (!saved.success) return err(saved.error);

    const lines = fillStartTimes(parseTimedLyrics(generated.data.timedLyricsText));
    const timings = matchBars(sanitizedVerses, lines);

    await this.deps.segments.deleteByBattle(battle.id);
    const segment: AudioSegment = {
      id: this.deps.newId(),
      battleId: battle.id,
      turnIndex: 0,
      rapper: 'A',
      fileName,
      mimeType: generated.data.mimeType,
      durationMs: null,
      timings: timings.length > 0 ? timings : null,
      createdAt: new Date(),
    };
    await this.deps.segments.save(segment);
    return ok(segment);
  }
}
