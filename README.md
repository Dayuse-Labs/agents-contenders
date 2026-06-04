# 🎤 Agent Contenders — application de battle

Application web qui met les battles en musique (voix chantées via **Lyria 3 / Gemini**), les rejoue avec **paroles synchronisées**, et fait **voter le public** — le tout protégé par **SSO Google Workspace** et déployé sur **Railway**.

## Ce que fait l'app

- **Génère la musique d'une battle** : un segment chanté **par rappeur** (Lyria 3), chacun avec sa propre voix pilotée par le `sexe` et l'`âge` de la personnalité → deux voix bien distinctes.
- **Rejoue la battle** dans un player sombre (façon proto « Historic Battle League ») : lecture segment par segment, **paroles affichées avec le couplet en cours surligné**.
- **Enregistre et permet de télécharger** les audios générés.
- **Fait voter le public** : un **QR code** ouvre la page de vote de la battle en cours. Chaque personne (authentifiée Workspace) vote **une fois** et peut **changer son vote** tant que la battle n'est pas clôturée (clôture + **5 min** de rab).
- **SSO Google Workspace** : accès restreint au domaine `dayuse.com`.

## Stack

Next.js (App Router) · TypeScript strict · Prisma + PostgreSQL · `@google/genai` (Lyria 3) · Auth.js (Google OIDC) · déploiement Railway. Standards : DDD, Zod, Result pattern, OWASP ASVS L1 (cf. skill `dayuse-vibes`).

## Architecture (DDD)

```
src/
├── domain/            # métier pur (aucune dépendance technique)
│   ├── entities/      # Battle, Vote, AudioSegment
│   ├── value-objects/ # Rapper (sexe/âge), VoteChoice
│   └── repositories/  # interfaces (BattleRepository, VoteRepository, …)
├── application/       # cas d'usage
│   ├── ports/         # MusicGenerator, AudioStorage
│   └── use-cases/     # GenerateBattleAudio, CastVote, …
├── infrastructure/    # implémentations techniques
│   └── music/         # LyriaMusicGenerator (@google/genai)
└── interfaces/        # (à venir) routes API + pages Next.js
```

## Comment marche la voix

`GenerateBattleAudio` parcourt les couplets (`Battle.verseSequence()`). Pour chaque couplet, il appelle Lyria avec un prompt qui décrit la voix (`female/male voice, sounds about N years old`) et impose les paroles via `[Verse: <nom>]`. Les segments sont sauvés sur le **volume** et leurs métadonnées en base. Le player les enchaîne → voix A et voix B nettement séparées.

## Comment marche le vote

L'email Workspace de la personne est **haché** (`sha256(email + VOTE_SALT)`) : on ne stocke **jamais l'email en clair** (minimisation RGPD). Un vote unique par `(battleId, voterHash)`, modifiable tant que `Battle.isVotingOpen()` est vrai (battle `LIVE`, jusqu'à `voteClosesAt` = fin + 5 min).

## Variables d'environnement

Voir `.env.example`. Principales : `GEMINI_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, `ALLOWED_HD` (= `dayuse.com`), `VOTE_SALT`, `AUDIO_DIR`, `APP_URL`.

## Développement local

```bash
npm install
cp .env.example .env   # puis remplir les valeurs
npm run db:push        # crée le schéma sur la base locale
npm run dev            # http://localhost:3000
```

Qualité (à lancer avant tout commit) :

```bash
npm run verify   # lint + typecheck + tests
```

## Déploiement Railway

1. Nouveau projet Railway → ajouter le **plugin PostgreSQL** (fournit `DATABASE_URL`).
2. Ajouter un **Volume** monté sur `/data/audio` (= `AUDIO_DIR`) pour persister les audios.
3. Renseigner les variables d'environnement (cf. `.env.example`).
4. Dans Google Cloud Console (OAuth client Web), ajouter l'URL de redirection `https://<ton-domaine-railway>/api/auth/callback/google`.
5. Build : `npm run build` · Start : `npm start`. Railway détecte Node automatiquement.

## Sécurité & RGPD

- Aucune donnée perso au-delà de l'email **haché** (anti-doublon de vote). PostgreSQL managé Railway (pas de DBaaS tiers).
- Secrets uniquement en variables d'environnement, validées par Zod au démarrage (`src/shared/env.ts`).
- Auth obligatoire (SSO), en-têtes de sécurité, rate-limiting et validation Zod des entrées (en cours d'implémentation).

## État & feuille de route

- [x] Socle : config, TS strict, validation d'env (Zod), Result pattern.
- [x] Domaine : Battle / Vote / AudioSegment + interfaces de repositories.
- [x] Application : ports (Lyria, stockage), cas d'usage `GenerateBattleAudio` & `CastVote`.
- [x] Infra : `LyriaMusicGenerator` (génération par segment).
- [x] Persistance Prisma (Postgres) + stockage volume (FilesystemAudioStorage).
- [x] SSO Google Workspace (Auth.js, vérif domaine `hd`) + middleware.
- [x] Routes API (import, génération, battle, vote, résultats, audio, transitions, QR).
- [x] Front : accueil, player dark synchronisé, page de vote (QR), écran admin.
- [ ] Tests Vitest + `npm run verify` (à lancer après `npm install`).
- [ ] Config de déploiement Railway (railway.json / variables) + guide animateur.
```
