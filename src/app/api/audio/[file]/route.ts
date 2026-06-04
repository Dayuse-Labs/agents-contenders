import type { NextRequest } from 'next/server';
import { services } from '@/composition';
import { jsonError } from '@/interfaces/http/http';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ file: string }>;
}

/** Sert un fichier audio depuis le volume (lecture, ou téléchargement avec ?download=1). */
export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { file } = await ctx.params;
  const result = await services.audioStorage.read(file);
  if (!result.success) return jsonError('Audio introuvable.', 404);

  const headers = new Headers();
  headers.set('Content-Type', result.data.mimeType);
  headers.set('Cache-Control', 'private, max-age=3600');
  if (req.nextUrl.searchParams.get('download') === '1') {
    headers.set('Content-Disposition', `attachment; filename="${file}"`);
  }
  // Copie dans un ArrayBuffer « propre » : Uint8Array<ArrayBufferLike> n'est pas un BodyInit valide.
  const body = new Uint8Array(result.data.bytes).buffer;
  return new Response(body, { status: 200, headers });
}
