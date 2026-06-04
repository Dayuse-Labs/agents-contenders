import { randomUUID } from 'node:crypto';
import { getEnv } from '@/shared/env';
import { prisma } from '@/infrastructure/persistence/prisma';
import { PrismaBattleRepository } from '@/infrastructure/repositories/prisma-battle-repository';
import { PrismaVoteRepository } from '@/infrastructure/repositories/prisma-vote-repository';
import { PrismaAudioSegmentRepository } from '@/infrastructure/repositories/prisma-audio-segment-repository';
import { FilesystemAudioStorage } from '@/infrastructure/storage/filesystem-audio-storage';
import { LyriaMusicGenerator } from '@/infrastructure/music/lyria-music-generator';
import { CastVote } from '@/application/use-cases/cast-vote';
import { GenerateBattleAudio } from '@/application/use-cases/generate-battle-audio';
import { ImportBattle } from '@/application/use-cases/import-battle';

/**
 * Composition root : on instancie ici les implémentations concrètes et on les
 * injecte dans les cas d'usage. Les routes API consomment `services`.
 */
const env = getEnv();

const battleRepository = new PrismaBattleRepository(prisma);
const voteRepository = new PrismaVoteRepository(prisma);
const segmentRepository = new PrismaAudioSegmentRepository(prisma);
const audioStorage = new FilesystemAudioStorage(env.AUDIO_DIR);
const musicGenerator = new LyriaMusicGenerator(env.GEMINI_API_KEY);

export const services = {
  env,
  battleRepository,
  voteRepository,
  segmentRepository,
  audioStorage,
  importBattle: new ImportBattle(battleRepository, segmentRepository, randomUUID),
  castVote: new CastVote(voteRepository),
  generateBattleAudio: new GenerateBattleAudio({
    music: musicGenerator,
    storage: audioStorage,
    segments: segmentRepository,
    newId: randomUUID,
  }),
} as const;

export type Services = typeof services;
