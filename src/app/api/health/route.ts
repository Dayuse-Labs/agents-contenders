export const runtime = 'nodejs';

/** Endpoint de santé public (utilisé par le healthcheck Railway). */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
