import { promises as fs } from 'node:fs';
import path from 'node:path';
import { type Result, ok, err } from '@/shared/result';
import type { AudioStorage, StoredAudio } from '@/application/ports/audio-storage';

/** Stockage des audios sur le système de fichiers (volume Railway monté sur AUDIO_DIR). */
export class FilesystemAudioStorage implements AudioStorage {
  constructor(private readonly baseDir: string) {}

  /** Empêche le path traversal : on n'accepte qu'un nom de fichier simple. */
  private resolveSafe(fileName: string): string | null {
    const base = path.basename(fileName);
    if (base !== fileName || base.length === 0 || base.startsWith('.')) return null;
    return path.join(this.baseDir, base);
  }

  async save(fileName: string, bytes: Uint8Array, _mimeType: string): Promise<Result<void, Error>> {
    const target = this.resolveSafe(fileName);
    if (!target) return err(new Error('Nom de fichier invalide.'));
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.writeFile(target, bytes);
      return ok(undefined);
    } catch (cause) {
      return err(cause instanceof Error ? cause : new Error("Échec d'écriture de l'audio."));
    }
  }

  async read(fileName: string): Promise<Result<StoredAudio, Error>> {
    const target = this.resolveSafe(fileName);
    if (!target) return err(new Error('Nom de fichier invalide.'));
    try {
      const buffer = await fs.readFile(target);
      return ok({ bytes: new Uint8Array(buffer), mimeType: mimeFromName(fileName) });
    } catch {
      return err(new Error('Fichier audio introuvable.'));
    }
  }
}

function mimeFromName(fileName: string): string {
  return fileName.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
}
