import type { NextRequest } from 'next/server';
import { services } from '@/composition';
import { jsonOk, jsonError } from '@/interfaces/http/http';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

/** Scores en direct (pour le rafraîchissement du player et de la page de vote). */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);
  const tally = await services.voteRepository.tally(battle.id);
  return jsonOk({
    tally,
    votingOpen: battle.isVotingOpen(),
    voteClosesAt: battle.voteClosesAt?.toISOString() ?? null,
  });
}
