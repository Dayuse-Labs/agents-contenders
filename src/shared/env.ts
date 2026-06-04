import { z } from 'zod';

/**
 * Validation des variables d'environnement au démarrage (Zod).
 * Ce module est strictement côté serveur : ne jamais l'importer dans du code client.
 */
const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY manquante'),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET doit faire au moins 32 caractères'),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  ALLOWED_HD: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((d) => d.trim().toLowerCase())),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  AUDIO_DIR: z.string().min(1).default('/data/audio'),
  VOTE_SALT: z.string().min(16, 'VOTE_SALT doit faire au moins 16 caractères'),
  APP_URL: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Charge et valide l'environnement une seule fois. Lève au démarrage si invalide. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
