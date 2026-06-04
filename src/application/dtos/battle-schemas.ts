import { z } from 'zod';
import { type Result, ok, err } from '@/shared/result';
import type { Rapper } from '@/domain/value-objects/rapper';
import type { Transcript } from '@/domain/entities/battle';

export const SexSchema = z.enum(['féminin', 'masculin']);
export const SideSchema = z.enum(['A', 'B']);

/** Rapper tel que stocké en base (avec `side`). */
export const RapperSchema = z.object({
  side: SideSchema,
  name: z.string().min(1).max(120),
  agent: z.string().min(1).max(120),
  sex: SexSchema,
  age: z.number().int().positive().max(200),
});

export const TurnSchema = z.object({
  rapper: SideSchema,
  bars: z.array(z.string().max(400)).min(1).max(64),
});

export const RoundSchema = z.object({
  round: z.number().int().positive(),
  turns: z.array(TurnSchema).min(1).max(8),
});

export const TranscriptSchema = z.array(RoundSchema).min(1).max(20);

/** Rapper tel qu'il arrive dans le JSON importé (avec `id`, et `voice` ignoré). */
const ImportRapperSchema = z.object({
  id: SideSchema,
  name: z.string().min(1).max(120),
  agent: z.string().min(1).max(120),
  sex: SexSchema,
  age: z.number().int().positive().max(200),
  voice: z.string().max(60).optional(),
});

export const ImportBattleSchema = z.object({
  battleId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'battleId doit être en kebab-case (a-z, 0-9, -)'),
  title: z.string().min(1).max(160).optional(),
  rappers: z.array(ImportRapperSchema).length(2),
  rounds: TranscriptSchema,
});

export interface ImportBattleInput {
  readonly slug: string;
  readonly title: string;
  readonly rapperA: Rapper;
  readonly rapperB: Rapper;
  readonly transcript: Transcript;
}

/** Valide un JSON de battle (format produit par /battle) et le mappe vers le domaine. */
export function parseImportBattle(input: unknown): Result<ImportBattleInput, Error> {
  const parsed = ImportBattleSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return err(new Error(`Transcript invalide — ${msg}`));
  }
  const a = parsed.data.rappers.find((r) => r.id === 'A');
  const b = parsed.data.rappers.find((r) => r.id === 'B');
  if (!a || !b) {
    return err(new Error('Le transcript doit contenir un rappeur A et un rappeur B.'));
  }
  const toRapper = (r: z.infer<typeof ImportRapperSchema>): Rapper => ({
    side: r.id,
    name: r.name,
    agent: r.agent,
    sex: r.sex,
    age: r.age,
  });
  const rapperA = toRapper(a);
  const rapperB = toRapper(b);
  return ok({
    slug: parsed.data.battleId,
    title: parsed.data.title ?? `${rapperA.name} vs ${rapperB.name}`,
    rapperA,
    rapperB,
    transcript: parsed.data.rounds,
  });
}
