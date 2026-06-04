import type { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { services } from '@/composition';
import { jsonError } from '@/interfaces/http/http';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

/** QR code (PNG) qui pointe vers la page de vote de la battle. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { slug } = await ctx.params;
  const battle = await services.battleRepository.findBySlug(slug);
  if (!battle) return jsonError('Battle introuvable.', 404);

  const base = services.env.APP_URL.replace(/\/$/, '');
  const voteUrl = `${base}/b/${encodeURIComponent(slug)}/vote`;
  const png = await QRCode.toBuffer(voteUrl, {
    width: 320,
    margin: 1,
    color: { dark: '#08080cff', light: '#ffffffff' },
  });
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
}
