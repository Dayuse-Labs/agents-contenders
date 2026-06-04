import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { services } from '@/composition';
import { currentUser } from '@/interfaces/http/session';
import { jsonOk, jsonError } from '@/interfaces/http/http';
import { voterHash } from '@/infrastructure/security/voter-hash';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

const VoteSchema = z.object({ choice: z.enum(['A', 'B']) });

/** Mon vote actuel + scores. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const user = await currentUser();
  if (!user) return jsonError('Non authentifié.', 401);
  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  const hash = voterHash(user.email, services.env.VOTE_SALT);
  const existing = await services.voteRepository.findByBattleAndVoter(battle.id, hash);
  const tally = await services.voteRepository.tally(battle.id);
  return jsonOk({ myVote: existing?.choice ?? null, votingOpen: battle.isVotingOpen(), tally });
}

/** Voter (ou changer son vote) — 1 par personne, tant que le vote est ouvert. */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const user = await currentUser();
  if (!user) return jsonError('Non authentifié.', 401);
  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Corps JSON invalide.', 400);
  }
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) return jsonError('Choix invalide (A ou B).', 400);

  const hash = voterHash(user.email, services.env.VOTE_SALT);
  const result = await services.castVote.execute({
    battle,
    voterHash: hash,
    choice: parsed.data.choice,
    newId: randomUUID,
  });
  if (!result.success) return jsonError(result.error.message, 409);

  const tally = await services.voteRepository.tally(battle.id);
  return jsonOk({ myVote: result.data.choice, tally });
}
