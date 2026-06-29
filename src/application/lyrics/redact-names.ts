/**
 * Caviarde les noms réels des deux rappeurs dans les paroles AVANT l'appel Lyria :
 * un nom de personnalité chanté (le sien ou celui de l'adversaire) déclenche la
 * protection anti-imitation de Lyria → PROHIBITED_CONTENT (cf. Céline / Albert
 * dans les transcripts). On remplace le nom de l'adversaire par « toi » et le
 * sien par « moi » pour garder une adresse directe naturelle dans le flow.
 *
 * Pur, sans effet de bord. On ne détecte QUE les deux noms connus de la battle,
 * pas des noms arbitraires.
 */

export interface VerseNames {
  readonly selfName: string;
  readonly opponentName: string;
}

/** En deçà, un token est trop court/ambigu pour être caviardé sans risque. */
const MIN_TOKEN_LEN = 3;

/** Suites de lettres/chiffres (Unicode) : « Céline », « E=mc² » → « E », « mc », « 2 ». */
const WORD = /[\p{L}\p{N}]+/gu;

/** Minuscule + sans accents, pour comparer insensiblement à la casse et aux accents. */
function normalizeWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Tokens normalisés d'un nom (longueur ≥ MIN_TOKEN_LEN). */
function nameTokens(name: string): Set<string> {
  return new Set(
    normalizeWord(name)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= MIN_TOKEN_LEN),
  );
}

export function redactNames(bars: readonly string[], names: VerseNames): string[] {
  const opponent = nameTokens(names.opponentName);
  const self = nameTokens(names.selfName);
  if (opponent.size === 0 && self.size === 0) return [...bars];

  return bars.map((bar) => {
    const replaced = bar.replace(WORD, (word) => {
      const norm = normalizeWord(word);
      if (opponent.has(norm)) return 'toi';
      if (self.has(norm)) return 'moi';
      return word;
    });
    // « Albert Einstein » → « toi toi » → « toi » : on fusionne les placeholders répétés.
    return replaced
      .replace(/\b(toi|moi)(?:\s+\1\b)+/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  });
}
