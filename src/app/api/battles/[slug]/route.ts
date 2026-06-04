import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { services } from '@/composition';
import { currentUser } from '@/interfaces/http/session';
import { jsonOk, jsonError } from '@/interfaces/http/http';
import { voterHash } from '@/infrastructure/security/voter-hash';
import { VOTE_GRACE_MS } from '@/shared/constants';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

/** Détail complet d'une battle pour le player (rappeurs, transcript, piste audio, scores, mon vote). */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  const [segments, tally, user] = await Promise.all([
    services.segmentRepository.findByBattle(battle.id),
    services.voteRepository.tally(battle.id),
    currentUser(),
  ]);
  const trackRow = segments[0] ?? null;

  let myVote: 'A' | 'B' | null = null;
  if (user) {
    const existing = await services.voteRepository.findByBattleAndVoter(
      battle.id,
      voterHash(user.email, services.env.VOTE_SALT),
    );
    myVote = existing?.choice ?? null;
  }

  return jsonOk({
    slug: battle.slug,
    title: battle.title,
    status: battle.status,
    votingOpen: battle.isVotingOpen(),
    voteClosesAt: battle.voteClosesAt?.toISOString() ?? null,
    rappers: { A: battle.rapperA, B: battle.rapperB },
    transcript: battle.transcript,
    track: trackRow
      ? {
          url: `/api/audio/${trackRow.fileName}`,
          mimeType: trackRow.mimeType,
          timings: trackRow.timings,
        }
      : null,
    // Conservé pour le compteur de l'écran admin (0 ou 1 ligne).
    segments: segments.map((s) => ({
      turnIndex: s.turnIndex,
      rapper: s.rapper,
      url: `/api/audio/${s.fileName}`,
      mimeType: s.mimeType,
    })),
    tally,
    myVote,
    isAdmin: user?.isAdmin ?? false,
  });
}

const StateSchema = z.object({ action: z.enum(['start', 'close', 'finalize']) });

/** Transitions de statut (admin) : start (ouvre le vote), close (+5 min), finalize (clôture). */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const user = await currentUser();
  if (!user) return jsonError('Non authentifié.', 401);
  if (!user.isAdmin) return jsonError('Réservé aux administrateurs.', 403);

  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Corps JSON invalide.', 400);
  }
  const parsed = StateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Action invalide.', 400);

  const next =
    parsed.data.action === 'start'
      ? battle.start()
      : parsed.data.action === 'close'
        ? battle.closeWithGrace(new Date(), VOTE_GRACE_MS)
        : battle.finalize();

  await services.battleRepository.save(next);
  return jsonOk({
    status: next.status,
    votingOpen: next.isVotingOpen(),
    voteClosesAt: next.voteClosesAt?.toISOString() ?? null,
  });
}
