import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getEnv } from '@/shared/env';

const env = getEnv();

/** Profil Google enrichi : `hd` = domaine Workspace (présent pour les comptes Workspace). */
interface GoogleProfile {
  email?: string;
  hd?: string;
}

function domainAllowed(email: string | undefined, hd: string | undefined): boolean {
  const allowed = env.ALLOWED_HD;
  const hostedDomain = hd?.toLowerCase();
  const emailDomain = email?.toLowerCase().split('@')[1];
  return Boolean(
    (hostedDomain && allowed.includes(hostedDomain)) ||
      (emailDomain && allowed.includes(emailDomain)),
  );
}

/**
 * SSO Google Workspace. L'accès est restreint au(x) domaine(s) ALLOWED_HD
 * (vérification du claim `hd` + repli sur le domaine de l'email).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: { hd: env.ALLOWED_HD[0] ?? '', prompt: 'select_account' },
      },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      const p = profile as GoogleProfile | undefined;
      return domainAllowed(p?.email, p?.hd);
    },
    session({ session }) {
      const email = session.user?.email?.toLowerCase() ?? '';
      const enriched = session.user as (typeof session.user & { isAdmin?: boolean }) | undefined;
      if (enriched) enriched.isAdmin = env.ADMIN_EMAILS.includes(email);
      return session;
    },
  },
});
