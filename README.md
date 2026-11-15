# Socrates — Campus Living Lab Carbon Literacy Agent

ATOX「AI for Climate」Hackathon · Team P39 (SNOOP) · working title **Socrates**.

A mobile-first carbon-literacy companion. It uses Motivational Interviewing
(OARS) Socratic dialogue; every emission number comes from a deterministic LCA
engine (never the LLM), with sources, uncertainty intervals and data-quality
grades. One codebase ships to the public web (Vercel) and Android (EAS APK).

## Stack (locked)

- **Expo + Expo Router** single codebase — react-native-web for web, native for APK.
- **Supabase** — Postgres (RLS), Auth, Storage, Edge Functions (Deno).
- **apps/avatar** — Vite + PixiJS v8 + Cubism 5 Live2D bundle; loaded directly on
  web and in a WebView on native, via a versioned postMessage protocol.
- **packages/core** — MI/OARS policy, tool schemas, LLM/TTS adapters, guards,
  design tokens, frozen protocols.
- **packages/data** — factor types, deterministic calculation pure functions.
- **packages/supabase** — migrations, RLS, Edge Functions.

## Workspace layout

```
apps/
  app/        Expo Router app (web + native)
  avatar/     Live2D web bundle (Vite + Pixi + Cubism)
packages/
  core/       domain policy, contracts, adapters, guards, tokens
  data/       factor library + deterministic LCA engine
  supabase/   migrations + edge functions
```

## Commands

```bash
pnpm install
pnpm typecheck      # strict TS across packages
pnpm test:unit      # Vitest in packages
pnpm lint
pnpm app web        # start the Expo app on web
pnpm avatar dev     # start the avatar bundle
```

## Hard rules

- Secrets only exist in Supabase function secrets and local `.env` (gitignored);
  the client bundle never contains them.
- Numbers only come from deterministic tools. The LLM does no arithmetic; the
  output guard rejects any number without a tool source in the current turn.
- Every factor carries source / interval / license. No source → leave blank.
- Scope frozen: 3 narrow categories + 2 demo stories + 1 end-to-end MI flow.
- Degradation L0–L4; demo mode works offline.
