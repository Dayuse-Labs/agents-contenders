import { auth } from '@/infrastructure/auth/auth';

export interface SessionUser {
  readonly email: string;
  readonly name: string | null;
  readonly isAdmin: boolean;
}

/** Renvoie l'utilisateur authentifié (ou null), avec le flag admin calculé. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const isAdmin = Boolean((session.user as { isAdmin?: boolean }).isAdmin);
  return { email, name: session.user?.name ?? null, isAdmin };
}
