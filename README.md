# NEXUS PROTOCOL

Mobile-first VIP staking & yield interface. Next.js 15 (App Router), strict TypeScript, Tailwind, Framer Motion, Zustand. Runs on an in-memory mock engine persisted to localStorage; no on-chain calls.

```
pnpm dev        # start
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm build
```

Layout: `src/config` (protocol constants), `src/types` (domain types), `src/content` (legal copy), `src/lib` (store, helpers), `src/components` (providers, layout, ui).
