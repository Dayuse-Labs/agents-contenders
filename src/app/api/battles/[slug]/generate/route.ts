import type { NextRequest } from 'next/server';
import { services } from '@/composition';
import { currentUser } from '@/interfaces/http/session';
import { jsonOk, jsonError } from '@/interfaces/http/http';

export const runtime = 'nodejs';
export const maxDuration = 300; // Lyria génère la piste complète → requête longue

interface Ctx {
  params: Promise<{ slug: string }>;
}

/** Génère la piste audio de la battle (un morceau continu, deux voix) — admin uniquement. */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const user = await currentUser();
  if (!user) return jsonError('Non authentifié.', 401);
  if (!user.isAdmin) return jsonError('Réservé aux administrateurs.', 403);

  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  const result = await services.generateBattleAudio.execute(battle);
  if (!result.success) {
    console.error(`[generate] ${slug} :`, result.error);
    return jsonError(`Génération échouée : ${result.error.message}`, 502);
  }
  return jsonOk({ generated: true, synced: result.data.timings !== null });
}
