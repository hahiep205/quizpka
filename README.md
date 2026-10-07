# Quizpka

Quizpka is a web app for quiz practice, chapter-based review, English placement tests, and TOEIC preparation. The frontend is built with Vite, React, and TypeScript. Supabase provides authentication, database services, private storage, and Edge Functions; Cloudflare R2 serves public question banks and media.

Production site: [quizpka.online](https://quizpka.online)

## Features

- Browse subjects, exams, and chapter-based practice.
- Take timed quizzes, review answers, and track practice history.
- Sign in and sync account data through Supabase.
- Use paid question banks and documents through authenticated Supabase Edge Functions.
- Access free question banks and public media from Cloudflare R2.
- Use the leaderboard, downloads, support reports, and admin tools backed by Supabase.

## Stack and services

- **Frontend:** React, TypeScript, Vite, and Tailwind CSS.
- **Hosting:** Vercel serves the static build from `dist/` and rewrites application routes to the SPA entry point.
- **Backend:** Supabase Auth and Postgres, with Edge Functions for server-side operations.
- **Paid content:** The private Supabase Storage bucket `paid-question-banks`, accessed through Edge Functions that check authorization and entitlements.
- **Free content:** Public Cloudflare R2 objects. The browser loads free question banks and supported media directly from the configured R2 public URL.

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are client-side settings; keep service-role keys, payment secrets, and other privileged credentials in backend or hosting secrets only.

## Requirements

- Node.js 22 or later
- npm 10 or later

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env.local` file before running the app. `VITE_SUPABASE_PROXY_URL` is optional; leave it unset to connect directly to Supabase.

## Commands

```bash
npm run dev           # start the local development server
npm run typecheck     # check application TypeScript
npm run lint          # run Oxlint
npm run test          # run Vitest
npm run validate:data # validate the local R2 question-bank mirror
npm run build         # validate the local mirror when present, typecheck, and build dist/
npm run preview       # preview the production build locally
npm run clean         # remove dist/
```

## Question banks and media

Free question-bank source files are kept in the local `r2-banks/data/` mirror and are ignored by Git. They are not required in the Vercel checkout: production fetches free banks from Cloudflare R2. `toBankUrl` and `toMediaUrl` in `src/lib/mediaUrl.ts` map supported logical paths to the configured public R2 URL.

Run `npm run validate:data` locally when the mirror is present. It checks local JSON structure, question counts, duplicate IDs, answer/options consistency, and media URL formats. If the mirror is absent during a Vercel build, this local-only validation is skipped; that skip does not check whether each remote R2 object exists. Confirm R2 uploads separately when adding or changing a bank.

Paid banks and documents belong in the private Supabase Storage bucket. The app requests them through the relevant Edge Functions after authorization and entitlement checks. Do not place paid content in `public/` or in the public R2 bucket.

## Project layout

```text
src/
  app/                 application layout and navigation
  auth/                Supabase authentication state
  data/                subject catalogue and question-bank paths
  features/            quiz, activity, downloads, admin, support, and notifications
  pages/               route-level screens
  lib/                 Supabase client and shared utilities
public/                static assets copied into the web build
scripts/               local data validation and maintenance scripts
r2-banks/data/         local-only mirror of public R2 question-bank objects
```

## Deployment

Vercel runs `npm run build` and publishes `dist/`. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings. Client-side values prefixed with `VITE_` are included in browser code and must not contain secrets.

Supabase database, Edge Functions, and Storage are backend services; they are not bundled into the Vite static output. Keep their deployment and backup procedures available to project maintainers even when their source files are stored outside the public GitHub repository.
