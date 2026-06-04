import type { AudioSegment } from '../entities/audio-segment';

export interface AudioSegmentRepository {
  findByBattle(battleId: string): Promise<readonly AudioSegment[]>;
  findById(id: string): Promise<AudioSegment | null>;
  save(segment: AudioSegment): Promise<void>;
  deleteByBattle(battleId: string): Promise<void>;
}
