import { describe, it, expect } from 'vitest';
import { redactNames } from './redact-names';

const NAMES = { selfName: 'Céline Dion', opponentName: 'Albert Einstein' };

describe('redactNames', () => {
  it("remplace le nom de l'adversaire par « toi »", () => {
    expect(redactNames(['Alors range ta craie, Albert :'], NAMES)).toEqual([
      'Alors range ta craie, toi :',
    ]);
  });

  it('remplace son propre nom par « moi »', () => {
    expect(redactNames(['le cœur qui finit en hit, signé Céline.'], NAMES)).toEqual([
      'le cœur qui finit en hit, signé moi.',
    ]);
  });

  it('matche les noms accentués indépendamment des accents', () => {
    expect(redactNames(['Celine et CÉLINE, même combat'], NAMES)).toEqual([
      'moi et moi, même combat',
    ]);
  });

  it('fusionne un nom multi-token en un seul placeholder', () => {
    expect(redactNames(['Albert Einstein a parlé'], NAMES)).toEqual(['toi a parlé']);
  });

  it('est insensible à la casse', () => {
    expect(redactNames(['ALBERT, albert, AlBeRt'], NAMES)).toEqual(['toi, toi, toi']);
  });

  it("ne touche pas un mot qui contient seulement le nom en sous-chaîne", () => {
    expect(redactNames(['Adamantium ne plie pas', 'Dionysos boit'], {
      selfName: 'Ada Lovelace',
      opponentName: 'Dion Waiters',
    })).toEqual(['Adamantium ne plie pas', 'Dionysos boit']);
  });

  it('ignore les tokens de moins de 3 caractères', () => {
    // « Jay » (3) caviardé, « Z » (1) conservé.
    expect(redactNames(['Z marque le coin, Jay débarque'], {
      selfName: 'moi-même',
      opponentName: 'Jay Z',
    })).toEqual(['Z marque le coin, toi débarque']);
  });

  it('laisse les bars intacts quand aucun nom ne matche', () => {
    expect(redactNames(['ma rime traverse les océans'], NAMES)).toEqual([
      'ma rime traverse les océans',
    ]);
  });
});
