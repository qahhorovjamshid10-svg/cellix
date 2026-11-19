# CELLIX 2.0 — Project Memory & Fast-Context Map

Read this first instead of scanning the repo from scratch. Keep it concise and update it whenever architecture, routes, schemas, or key conventions change.

## 1. Core Stack
- **Framework**: Next.js 16.3.0 (App Router, Turbopack), React 19.2.8, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Game Engine**: Phaser (`VirusGameContainer.tsx` dynamically imported with `ssr: false`), procedural 3D Canvas/SVG textures (`CharacterRenderer.ts`, `PixelCharacterAvatar.tsx`).
- **Database**: PostgreSQL + Prisma 6 (`prisma/schema.prisma`): `Player`, `RunSession`, `GameRun`, `DailyResult`, `PlayerProgression`, `RateLimitBucket`, `GameSession`, `HighScore`, `Session`, `PaymentTransaction`.
- **Realtime Bio-War Server**: Standalone `ws` server (`server/biowar-server.ts`, script `npm run biowar:server`, default port `3001`) + client (`lib/game/biowarNetwork.ts`) with automatic local bot simulation fallback when WS is offline.
- **Audio**: Zero-asset Web Audio API synthesizer (`lib/game/engine/SoundManager.ts`) for SFX, UI feedback, and reactor ambient synth.

## 2. File & Architecture Map
### Pages (`app/`)
- `/` (`app/page.tsx`): Landing hub, kinetic dual `<Marquee>` (`.v-tape-yellow`), 01–04 battle sectors, controls telemetry.
- `/game` (`app/game/page.tsx`): Mode selector (`classic`, `survival`, `daily`, `biowar`), daily lock timer, mounts `<VirusGameContainer />` with `onExitToModes`.
- `/settings` (`app/settings/page.tsx`): Full Settings UI (`<SettingsPanel />` — theme, sound mixer, controls, quality, FPS HUD, keymap, language).
- `/skins` (`app/skins/page.tsx` -> `components/SkinMarket.tsx`): 3D Skin Armory & Economy purchases.
- `/leaderboard` (`app/leaderboard/page.tsx`): Global & Daily rankings.
- `/profile/[id]` (`app/profile/[id]/page.tsx`): Player Dossier, bio/username editing, stats heatmap, owned skins.
- `/auth` (`app/auth/page.tsx`): Login / Register (`syncPlayerSession` updates Navbar live).

### Global UI & Context (`components/` & `app/`)
- `app/layout.tsx`: Wraps `<SettingsProvider>`, `<LanguageProvider>`, `<InitialSplashLoader />`, `<CustomCursor />` + pre-paint theme script (`cellix_settings_v2`).
- `app/globals.css`: Dark (`:root`) and soft low-glare Daylight Sage-Stone (`html[data-theme="light"]`) tokens (`ink`, `bone`, `acid`, `tide`, `ember`, `gold`), `.v-panel`, `.v-card`, `.v-btn`, `.v-dots`, `.v-tape-yellow`, `.v-slider`, GPU animations.
- `components/Navbar.tsx`: Sleek header (`CELLIX 2.0`), nav capsule (`ARMORY`, `LADDER`, live-synced `activePlayer.username` or `KIRISH`/`LOGIN`), theme toggle, **icon-only** Settings link (`/settings`), `UZ|EN` toggle, `<CoinWallet />`, `ARENA` CTA (**audio toggle belongs strictly in Settings / Pause**).
- `components/v26/`: `CellixLoader.tsx` (1–100% progress + SVG emblem), `InitialSplashLoader.tsx`, `CustomCursor.tsx`, `Marquee.tsx`, `Reveal.tsx`, `ScrambleText.tsx`, `CountUp.tsx`.

### Client Stores (`lib/game/`)
- `settings.ts` & `components/SettingsContext.tsx`: `cellix_settings_v2` (`theme`, `masterMuted`, `sfxVolume`, `uiVolume`, `ambientVolume`, `movementMode`, `defaultFireMode`, `aimSensitivity`, `cameraShake`, `damageNumbers`, `graphicsQuality`, `showFpsHud`, `customCursor`, `autoShowControls`).
- `playerSession.ts`: Deduplicated `/api/auth/me` store (`cellix_player_cache_v1`) synced across login/register/profile-edit/logout so Navbar shows real live nickname.
- `cosmetics.ts`: Skin configs + coin/owned-skin sync (`COINS_CHANGED_EVENT`, `syncCoinBalance`).
- `daily.ts`, `mutations.ts`, `combos.ts`, `achievements.ts`, `progression.ts`, `balance.ts`.

### Phaser Game Modules (`components/game/` & `lib/game/engine/`)
- `VirusGameContainer.tsx`: Boots Phaser via `callbacks.postBoot`, manages run tokens (`/api/game/run/start`), universal `Escape`/`P` pause across **all 4 modes including `biowar`**, `cleanupAndLeave('modes'|'hub')` (calls `g.loop?.sleep?.()` before `g.destroy(true)` to prevent canvas `drawImage` teardown errors).
- `PauseOverlay.tsx`: Universal pause + inline compact `<SettingsPanel compact />` tab + working `MODES` (`/game`) and `TO HUB` (`/`) exits.
- `BioWarHUD.tsx`: HUD (`[ESC] MENYU` button, optional FPS pill, radar, leaderboard showing honest `humanPlayers` vs `botPlayers`, death modal with Respawn, `HUBGA QAYTISH` (`/`), and `ARENA REJIMLARI` (`/game`)).
- `GameOverModal.tsx`: Submits score to `/api/game/score`, PNG card export (`CELLIX // 2.0`), Hub + Modes + Ladder CTAs.
- Scenes: `MainScene.ts` (Classic/Daily), `SurvivalScene.ts` (10 waves + mini/mega boss), `BioWarScene.ts` (`setUiPaused`, `restartArenaMatch`, `saveAndEndCurrentRun`), `ArenaCombatHelper.ts` (`safeCameraShake`, shared 20-mutation systems), `CombatVisuals.ts` (`damageNumbers` setting).

### Security & Backend Hardening (#1–#10)
- `lib/security.ts`, `lib/ratelimit.ts`: Fail-closed `SESSION_SECRET`, trusted proxy IP parsing (`TRUSTED_PROXY_COUNT`), DB-backed sliding/bucket rate limits (`RateLimitBucket`).
- `lib/game/serverValidation.ts`: Run Integrity & Anti-Cheat (`RunSession` server seeds/daily config, cross-checks XP/level, kills, damage, crits, waves, boss state, suspicious flagging).
- API routes: `/api/auth/*`, `/api/economy/*`, `/api/game/run/start`, `/api/game/run/finish`, `/api/game/score`, `/api/game/daily/status`, `/api/game/leaderboard`, `/api/profile/[id]`, `/api/profile/update`.

## 3. Verification & Gotchas
- **Tests & Checks** (use `;` not `&&` in Windows PowerShell 5.1):
  - `npx tsx scratch/test_anticheat.js` (15 tests)
  - `npx tsx scratch/test_biowar_server.js` (6 tests)
  - `npx tsx scratch/test_ratelimit.js` (6 tests)
  - `npx tsc --noEmit` · `npm run lint` · `npm run build`
- **React 19 / Next 16 ESLint Rules**: Do NOT mutate `ref.current` during render (`react-hooks/refs`) and do NOT call synchronous `setState` at top of `useEffect` (`react-hooks/set-state-in-effect`); prefer `useSyncExternalStore` or lazy `useState` init.
- **Instability Avoidance**: Keep callbacks passed to `<VirusGameContainer />` (`onDailyBlocked`, `onExitToModes`) memoized with `useCallback` and pause selector timers while in-game (`if (selectedMode) return`), otherwise Phaser tears down every second.
- **Line Endings & Windows Locks**: Avoid parallel `edit_file` calls targeting the same file simultaneously on Windows.
