# CELLIX v2.1 — 2D Action Roguelite

CELLIX is a fast-paced browser roguelite set inside a digital cell arena. Build a mutation loadout, survive escalating enemy waves, and submit verified run results to the leaderboard.

## Stack

- Next.js 16.3.0 App Router
- React 19 + TypeScript
- Phaser 4.2.1
- Tailwind CSS v4
- Prisma 6 + SQLite

## Game modes

- Classic: endless arena difficulty with enemies, elites, hazards and the Ancient Cell boss.
- Survival: ten structured waves with elite packs, minibosses, rewards and a final boss.
- Daily Challenge: a deterministic date-based modifier, seed, score multiplier and separate daily leaderboard.

## Core systems

- Mutation cards with Common, Rare, Epic and Legendary rarity.
- Reroll, banish and mutation combo effects.
- Acid, electric and gravity hazards with warnings and damage callbacks.
- Dash, invulnerability frames, special pulse, auto-aim and responsive mobile controls.
- Pause/resume, sound toggle, bilingual UZ/EN UI and a responsive navigation menu.
- Server-created run tokens, expiry checks, duplicate-finish protection and persistent rate limiting.
- Permanent Cell Level progression, run history, daily results, achievements and run metrics.

## Controls

Desktop: WASD/arrow keys move, mouse or arrow keys aim/fire, Space dashes, and E triggers the special pulse.

Mobile: use the left joystick to move, Target to auto-aim/fire, Dash for invulnerability, and Special for the radial pulse.

## Local setup

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the hub and [http://localhost:3000/game](http://localhost:3000/game) for mode selection.

Copy `.env.example` to `.env` and set `DATABASE_URL`. Production deployments must also set a strong `SESSION_SECRET`; trusted proxy parsing is opt-in through `TRUSTED_PROXY=true`.

## Verification

```bash
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
git diff --check
```

## Known limitations

- SQLite is suitable for local and small single-region deployments; use a shared database or Redis-backed limiter for larger deployments.
- Phaser gameplay still needs a manual desktop/mobile smoke run in a browser after deployment.
- Client-reported metrics are bounded and token-checked, but full authoritative simulation remains outside v2.1 scope.
