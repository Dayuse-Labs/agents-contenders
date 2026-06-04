import type { Result } from '@/shared/result';

export interface StoredAudio {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

/** Port : stockage des fichiers audio (volume Railway en prod). */
export interface AudioStorage {
  save(fileName: string, bytes: Uint8Array, mimeType: string): Promise<Result<void, Error>>;
  read(fileName: string): Promise<Result<StoredAudio, Error>>;
}
