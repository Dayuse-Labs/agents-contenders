import { Prisma, type PrismaClient } from '@prisma/client';
import type { AudioSegment, TimedBar } from '@/domain/entities/audio-segment';
import type { RapperSide } from '@/domain/value-objects/rapper';
import type { AudioSegmentRepository } from '@/domain/repositories/audio-segment-repository';
import { TimedBarsSchema } from '@/application/lyrics/match-bars';

interface SegmentRow {
  id: string;
  battleId: string;
  turnIndex: number;
  rapper: string;
  fileName: string;
  mimeType: string;
  durationMs: number | null;
  timings: unknown;
  createdAt: Date;
}

/** Valide les timings relus depuis la colonne Json (null si malformés). */
function parseTimings(raw: unknown): readonly TimedBar[] | null {
  if (raw === null || raw === undefined) return null;
  const parsed = TimedBarsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function toDomain(row: SegmentRow): AudioSegment {
  const rapper: RapperSide = row.rapper === 'B' ? 'B' : 'A';
  return {
    id: row.id,
    battleId: row.battleId,
    turnIndex: row.turnIndex,
    rapper,
    fileName: row.fileName,
    mimeType: row.mimeType,
    durationMs: row.durationMs,
    timings: parseTimings(row.timings),
    createdAt: row.createdAt,
  };
}

function timingsToJson(timings: readonly TimedBar[] | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return timings === null ? Prisma.DbNull : (timings as unknown as Prisma.InputJsonValue);
}

export class PrismaAudioSegmentRepository implements AudioSegmentRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByBattle(battleId: string): Promise<readonly AudioSegment[]> {
    const rows = await this.db.audioSegment.findMany({
      where: { battleId },
      orderBy: { turnIndex: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<AudioSegment | null> {
    const row = await this.db.audioSegment.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async save(segment: AudioSegment): Promise<void> {
    await this.db.audioSegment.upsert({
      where: { battleId_turnIndex: { battleId: segment.battleId, turnIndex: segment.turnIndex } },
      create: {
        id: segment.id,
        battleId: segment.battleId,
        turnIndex: segment.turnIndex,
        rapper: segment.rapper,
        fileName: segment.fileName,
        mimeType: segment.mimeType,
        durationMs: segment.durationMs,
        timings: timingsToJson(segment.timings),
      },
      update: {
        rapper: segment.rapper,
        fileName: segment.fileName,
        mimeType: segment.mimeType,
        durationMs: segment.durationMs,
        timings: timingsToJson(segment.timings),
      },
    });
  }

  async deleteByBattle(battleId: string): Promise<void> {
    await this.db.audioSegment.deleteMany({ where: { battleId } });
  }
}
