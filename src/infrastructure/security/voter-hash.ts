import { createHash } from 'node:crypto';

/**
 * Identifiant anonyme et stable d'un votant : sha256(email + sel).
 * On ne stocke jamais l'email en clair (minimisation RGPD), mais on peut
 * dédupliquer les votes (1 par personne) et permettre la modification.
 */
export function voterHash(email: string, salt: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash('sha256').update(`${normalized}:${salt}`).digest('hex');
}
