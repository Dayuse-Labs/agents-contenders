import type { NextRequest } from 'next/server';
import { services } from '@/composition';
import { parseImportBattle } from '@/application/dtos/battle-schemas';
import { currentUser } from '@/interfaces/http/session';
import { jsonOk, jsonError } from '@/interfaces/http/http';

export const runtime = 'nodejs';

/** Liste les battles (toute personne authentifiée). */
export async function GET(): Promise<Response> {
  const battles = await services.battleRepository.list();
  return jsonOk(
    battles.map((b) => ({
      slug: b.slug,
      title: b.title,
      status: b.status,
      votingOpen: b.isVotingOpen(),
    })),
  );
}

/** Importe (ou met à jour) une battle depuis un transcript JSON — admin uniquement. */
export async function POST(req: NextRequest): Promise<Response> {
  const user = await currentUser();
  if (!user) return jsonError('Non authentifié.', 401);
  if (!user.isAdmin) return jsonError('Réservé aux administrateurs.', 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Corps JSON invalide.', 400);
  }

  const parsed = parseImportBattle(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await services.importBattle.execute(parsed.data);
  if (!result.success) return jsonError('Import impossible.', 500);
  return jsonOk({ slug: result.data.slug, title: result.data.title }, 201);
}
