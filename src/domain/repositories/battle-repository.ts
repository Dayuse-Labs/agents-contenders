import type { Battle } from '../entities/battle';

export interface BattleRepository {
  findById(id: string): Promise<Battle | null>;
  findBySlug(slug: string): Promise<Battle | null>;
  list(): Promise<readonly Battle[]>;
  save(battle: Battle): Promise<void>;
}
