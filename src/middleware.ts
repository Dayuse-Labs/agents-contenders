import { auth } from '@/infrastructure/auth/auth';

/**
 * Protège toute l'app par le SSO Google Workspace : un visiteur non authentifié
 * est redirigé vers la connexion (sauf routes d'auth et assets statiques).
 */
export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/api/auth/signin', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
  return undefined;
});

export const config = {
  matcher: ['/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)'],
};
