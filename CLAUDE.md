# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Agent Contenders" — a rap-battle web app: generates sung audio per rapper via Lyria 3 (Gemini API), replays battles with synced lyrics, and lets the audience vote via QR code. Access is restricted to the `dayuse.com` Google Workspace domain (SSO). Deployed on Railway.

## Commands

```bash
docker compose up -d # local PostgreSQL (container agent-contenders-pg, host port 5435)
npm run dev          # dev server at http://localhost:3000
npm run verify       # lint + typecheck + tests — run before any commit
npm run test         # vitest run (all tests)
npx vitest run src/domain/entities/battle.test.ts   # single test file
npm run test:watch   # vitest watch mode
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run db:push      # push prisma schema to local DB (no migrations used)
npm run build        # prisma generate + next build
```

In local dev, `AUDIO_DIR` must point to a writable local path (e.g. `./audio`, gitignored) — the production default `/data/audio` cannot be created on macOS (read-only root FS) and makes audio generation fail at the save step.

Local SSO only works on **port 3000** (the Google OAuth redirect URI is registered for `localhost:3000`). If Next falls back to 3001, another project (often `ai-loading` / "Hotel Photo Discovery") is holding port 3000 — stop it first.

Local setup requires a `.env` (copy `.env.example`); `src/shared/env.ts` validates all env vars with Zod at startup and throws if invalid. Tests live in `src/**/*.test.ts` (node environment, `@` aliased to `src/`).

## Architecture

Strict DDD layering (per the `dayuse-vibes` skill standards). Dependency direction is inward only — `domain` has zero technical imports:

- `src/domain/` — pure business logic: entities (`Battle`, `Vote`, `AudioSegment` — immutable classes whose state transitions return new instances, e.g. `battle.start()`, `closeWithGrace()`, `finalize()`), value objects (`Rapper` with sex/age, `VoteChoice`), and repository **interfaces**.
- `src/application/` — use cases (`ImportBattle`, `GenerateBattleAudio`, `CastVote`), ports (`MusicGenerator`, `AudioStorage`), and Zod DTOs (`battle-schemas.ts`).
- `src/infrastructure/` — implementations: Prisma repositories, `FilesystemAudioStorage` (writes to `AUDIO_DIR`, a Railway volume at `/data/audio`), `LyriaMusicGenerator`, Auth.js setup, `voter-hash.ts`.
- `src/interfaces/http/` — shared API helpers: `jsonOk`/`jsonError` envelope (`{ ok, data | error }`) and `currentUser()` session accessor.
- `src/app/` — Next.js App Router pages and API routes. Routes consume `services` only.

**Composition root**: `src/composition.ts` wires concrete implementations into use cases and exports a single `services` object. API routes import `services` — never instantiate repositories or use cases directly.

**Result pattern**: business errors are returned, not thrown — `Result<T, E>` from `src/shared/result.ts` with `ok`/`err`/`isOk`/`isErr`. Use cases and ports return `Result`; routes translate failures to `jsonError`.

## Key flows

- **Auth**: `src/middleware.ts` redirects every unauthenticated request to Google sign-in (except `/api/auth`, `/api/health`, static assets). `src/infrastructure/auth/auth.ts` rejects sign-ins outside `ALLOWED_HD` domains (checks the `hd` claim, falls back to email domain) and sets `isAdmin` on the session from `ADMIN_EMAILS`. Admin-only routes (generate, transitions) check `user.isAdmin`.
- **Voting / GDPR**: voter emails are never stored — only `sha256(email + VOTE_SALT)` (`src/infrastructure/security/voter-hash.ts`). One vote per `(battleId, voterHash)` (DB unique constraint), changeable while `Battle.isVotingOpen()` — i.e. status `LIVE` and before `voteClosesAt` (= close time + 5 min grace).
- **Audio generation**: `GenerateBattleAudio` makes ONE Lyria call for the whole battle — a single continuous track where both voices alternate per verse (`[Verse - Rapper A/B]` sections, voices described by sex/age only). Lyria's response includes timed lyrics (text parts like `[10.6:] line`, with only the first line of each verse explicitly timestamped — the rest interpolated by `fillStartTimes`). Stored as `TimedBar[]` in `AudioSegment.timings` (one row per battle, `turnIndex=0`). Generation is slow (~1-2 min) — the route sets `maxDuration = 300`; generate audio ahead of the live show.
- **Lyrics sync** (`src/application/lyrics/`): the player displays **Lyria's own returned lines** (not the canonical transcript) so highlight timing and displayed text are always aligned — one `TimedBar` per Lyria line. `matchBars` attributes each line to a verse/rapper by forward fuzzy-matching (Jaccard, window 8, threshold 0.3) against the transcript bars; unmatched lines (ad-libs, outro) inherit the previous attribution. The player highlights by `startMs <= currentTime`, with a proportional-over-canonical-bars fallback when `timings` is null.
- **Lyria content blocking**: never put a performer's name in the prompt or have a rapper sing their own name in the lyrics — it triggers `PROHIBITED_CONTENT` (anti-voice-cloning, the one filter with no configurable `safetySettings`). `VoiceSpec` deliberately has no `name` field. The prompt header is name-free by construction, but the **lyric bars are not trustworthy** (agents may write the opponent's/own real name, e.g. "signé Céline", or quote copyrighted songs). So `GenerateBattleAudio` runs `redactNames` (`src/application/lyrics/redact-names.ts`) over each verse before the Lyria call — opponent's name → "toi", own name → "moi" — and feeds the **same sanitized verses** to `matchBars` so karaoke attribution stays aligned with what Lyria actually sings. The upstream `kit/commands/battle.md` also instructs rappers to avoid real names/lyrics at the source.

## Conventions

- Comments and user-facing strings are in **French**; code identifiers in English. Keep this.
- TypeScript strict, no `any`. Validate external input with Zod (DTOs in `src/application/dtos/`).
- No Prisma migrations — schema is applied with `prisma db push` (also at deploy start, see `railway.json`).
- `src/shared/env.ts` is server-only; never import it (or anything pulling it in, like `composition.ts`) from client components.
