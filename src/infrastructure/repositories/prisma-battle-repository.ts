import type { PrismaClient, Prisma } from '@prisma/client';
import { Battle, type BattleStatus, type Transcript } from '@/domain/entities/battle';
import type { Rapper } from '@/domain/value-objects/rapper';
import type { BattleRepository } from '@/domain/repositories/battle-repository';
import { RapperSchema, TranscriptSchema } from '@/application/dtos/battle-schemas';

interface BattleRow {
  id: string;
  slug: string;
  title: string;
  rapperA: unknown;
  rapperB: unknown;
  transcript: unknown;
  status: string;
  voteClosesAt: Date | null;
  createdAt: Date;
}

function toDomain(row: BattleRow): Battle {
  const rapperA = RapperSchema.parse(row.rapperA) as Rapper;
  const rapperB = RapperSchema.parse(row.rapperB) as Rapper;
  const transcript = TranscriptSchema.parse(row.transcript) as Transcript;
  return new Battle(
    row.id,
    row.slug,
    row.title,
    rapperA,
    rapperB,
    transcript,
    row.status as BattleStatus,
    row.voteClosesAt,
    row.createdAt,
  );
}

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

export class PrismaBattleRepository implements BattleRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Battle | null> {
    const row = await this.db.battle.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Battle | null> {
    const row = await this.db.battle.findUnique({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  async list(): Promise<readonly Battle[]> {
    const rows = await this.db.battle.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toDomain);
  }

  async save(battle: Battle): Promise<void> {
    const data = {
      slug: battle.slug,
      title: battle.title,
      rapperA: asJson(battle.rapperA),
      rapperB: asJson(battle.rapperB),
      transcript: asJson(battle.transcript),
      status: battle.status,
      voteClosesAt: battle.voteClosesAt,
    };
    await this.db.battle.upsert({
      where: { id: battle.id },
      create: { id: battle.id, ...data },
      update: data,
    });
  }
}
