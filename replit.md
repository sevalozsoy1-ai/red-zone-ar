# Ephesus AR Kamera Deneyimi

Ephesus Medya için geliştirilen çok dilli, kamera tabanlı etkileşimli mobil deneyim.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/ephesus-ar run dev` — run the Expo mobile app through its managed workflow
- `pnpm --filter @workspace/ephesus-ar run typecheck` — verify the mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ephesus-ar/app/index.tsx` — mobile navigation and supporting screens
- `artifacts/ephesus-ar/components/BattleScreen.tsx` — live camera interaction screen
- `artifacts/ephesus-ar/context/GameContext.tsx` — persistent local game state
- `artifacts/ephesus-ar/constants/colors.ts` — Ephesus tactical visual tokens

## Architecture decisions

- The first playable version is frontend-first and stores progress locally with AsyncStorage.
- Camera must be real on both native and web; denied or blocked access shows an actionable error, never a simulated view.
- Camera imagery stays local. Weapon overlays are a simulation over the live feed, not world-anchored AR. Sniper magnification is digital.
- The game uses one focused full-screen flow instead of tabs to preserve immersion.

## Product

- Animated opening and permission onboarding
- Turkish, English, German, and Ukrainian interface support
- Region selection, home screen, armory, Pro credit store, and settings
- Live rear-camera preview with permission recovery, a curated catalog of 45 freely selectable real-world model names across 6 categories, audio effects, joystick aiming, recoil, barrel heat/cooling, and zoom-based digital scope
- Model IDs are stable and persisted (legacy `pistol`/`rifle`/`sniper` saves migrate automatically). Models share four illustrated weapon archetypes and three bundled Foley archetypes; the catalog does not claim unique recordings, photoreal models, or every weapon worldwide. Gameplay statistics are illustrative rather than technical specifications.
- Rewarded ads are explicitly simulated, with cancellation and one magazine refill per completed simulation. No ad network is connected.
- True 3D AR, semantic room analysis, real payments/rewarded ads, and saved camera video remain incomplete; do not label the app production-ready.

## User preferences

- Enemy gameplay was explicitly removed. Do not reintroduce soldiers, target placement, opposing countries, or hit counters. The user subsequently requested weapon-only shooting, without enemies.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
