# NEXUS PROTOCOL

Mobile-first web app for a compute-node staking product. Next.js 15 (App Router), React 19, strict TypeScript, Tailwind CSS 3.4, framer-motion, zustand. English and Russian.

## What is in the app

- **Home** — brand bar with network pill, promotional carousel, activity ticker, quick actions (recharge, withdraw, invite, guide), node pool list with capacity and a stake CTA, recent settlements.
- **Staking** — VIP 0–8 compute nodes with daily output, 1/7/30-day projections, prorated upgrades, allocation sheet, tier comparison.
- **Validator** — the user's running node, 00:00 UTC settlement cycle, claiming output, node history.
- **Assets** — deposit (network picker, QR), withdraw (KYC limits, fee breakdown, transaction-password and authenticator checks), history.
- **Rewards** — daily check-in streak, missions, gift codes; **Promotions** — staking festival with a first-activation bonus ticket.
- **Profile** — identity bar, assets and account points, quick actions, Account Settings (language, notifications), Account Security (login password, Google Authenticator, transaction password, email change), My Team, Invite Friends (QR, copy, share), About, legal pages, Support chat and tickets.
- **Auth** — welcome gateway, sign in (email or username), sign up with country picker and invite code, password reset.

## Current status

Everything runs in the browser. State lives in a zustand store persisted to `localStorage`; the yield engine, ledger, deposits and withdrawals, KYC review, referral commissions, chat replies and the activity feeds are all computed on the device. There is no backend, database, payment processor or blockchain integration in this repository yet, and the UI says so (the "Demo mode" strip, "Demo feed" chips, the About page and the legal texts).

Before any public launch the product needs a server-side ledger and authentication, custody or payment integration, a KYC provider, and a legal review of the yield model and the referral program.

## Development

```
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm build && pnpm start
```

Demo account: `demo@nexus.example` / `Demo@2026` (the "Demo Login" button on the sign-in screen).

## Layout

`src/app` routes · `src/components` (auth, home, invite, language, layout, promo, screens, security, support, ui, vip) · `src/lib` (store, engine, i18n, helpers) · `src/config` (protocol, nodes, rewards, KYC) · `src/types` (domain types) · `src/content` (legal copy).
