# Déploiement Railway

## 1. Google Cloud — OAuth (SSO Workspace)
1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs** : `https://<ton-domaine-railway>/api/auth/callback/google`
   (et `http://localhost:3000/api/auth/callback/google` pour le local).
4. Récupère **Client ID** et **Client secret** → variables `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. (Workspace) L'accès est de toute façon restreint au domaine `ALLOWED_HD` côté app.

## 2. Railway — services
1. Nouveau projet → **Deploy from GitHub repo** (pointer sur `contenders-app/`).
2. Ajouter le plugin **PostgreSQL** → fournit automatiquement `DATABASE_URL` (référencer la variable).
3. Ajouter un **Volume** monté sur **`/data/audio`** (= `AUDIO_DIR`) pour persister les audios générés.
4. `railway.json` est déjà fourni : build `npm run build`, start = `prisma db push` (crée le schéma) puis `next start`, healthcheck `/api/health`.

## 3. Variables d'environnement (Railway → Variables)
| Variable | Valeur |
|---|---|
| `GEMINI_API_KEY` | ta clé Gemini (Lyria) |
| `DATABASE_URL` | référence du plugin Postgres |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth client (étape 1) |
| `ALLOWED_HD` | `dayuse.com` |
| `ADMIN_EMAILS` | emails admins, séparés par des virgules |
| `AUDIO_DIR` | `/data/audio` |
| `VOTE_SALT` | `openssl rand -base64 32` |
| `APP_URL` | l'URL publique Railway (ex. `https://agent-contenders.up.railway.app`) |

> Les variables doivent être présentes **au build et au runtime** (Railway les injecte aux deux).

## 4. Vérifier en local d'abord
```bash
npm install
cp .env.example .env   # remplir
npm run db:push
npm run verify         # lint + typecheck + tests
npm run dev
```

## 5. Notes
- La génération Lyria peut être longue (plusieurs segments) → l'app autorise jusqu'à 5 min (`maxDuration`). Génère les audios **en amont** du show.
- Les audios vivent sur le volume : ne sont pas commités, persistent entre déploiements.
- RGPD : seul un **hash** d'email est stocké pour les votes (jamais l'email en clair).
