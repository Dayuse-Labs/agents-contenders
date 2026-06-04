import { type Result, ok } from '@/shared/result';
import { Battle } from '@/domain/entities/battle';
import type { BattleRepository } from '@/domain/repositories/battle-repository';
import type { AudioSegmentRepository } from '@/domain/repositories/audio-segment-repository';
import type { ImportBattleInput } from '@/application/dtos/battle-schemas';

/**
 * Crée (ou met à jour) une battle à partir d'un transcript importé.
 * Si une battle existe déjà pour ce slug, on conserve son id, son statut et sa
 * fenêtre de vote (on ne réinitialise pas un vote en cours) — mais on supprime
 * ses segments audio : le transcript a pu changer, l'audio doit être regénéré.
 */
export class ImportBattle {
  constructor(
    private readonly battles: BattleRepository,
    private readonly segments: AudioSegmentRepository,
    private readonly newId: () => string,
  ) {}

  async execute(input: ImportBattleInput): Promise<Result<Battle, never>> {
    const existing = await this.battles.findBySlug(input.slug);
    const battle = new Battle(
      existing?.id ?? this.newId(),
      input.slug,
      input.title,
      input.rapperA,
      input.rapperB,
      input.transcript,
      existing?.status ?? 'DRAFT',
      existing?.voteClosesAt ?? null,
      existing?.createdAt ?? new Date(),
    );
    if (existing) await this.segments.deleteByBattle(existing.id);
    await this.battles.save(battle);
    return ok(battle);
  }
}
