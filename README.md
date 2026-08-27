# QuizPKA

QuizPKA is a Vite + React application for practice quizzes, chapter-based revision, English placement tests, and TOEIC sets.

## Requirements

- Node.js 22 or later
- npm 10 or later

## Commands

```bash
npm install
npm run dev          # local development server
npm run typecheck    # TypeScript validation
npm run lint         # Oxlint, including type-aware rules
npm run test         # unit tests with Vitest
npm run validate:data # validate question-bank shapes, counts, answers, and media links
npm run sync:data    # manual utility: copy source banks from /data into public/data (no-op without /data)
npm run clean        # remove the generated dist/ directory
npm run build        # validate data, typecheck, and build dist/
npm run preview      # serve dist/ locally
```

## Project structure

```text
src/
  app/                application layout
  components/         reusable and feature-level UI
  data/               subject catalogues and client-side metadata
  features/quiz/      quiz domain model, loaders, adapters, and UI
  pages/              route-level screens
  security/           client-side interaction controls
public/data/          published question banks and media assets
scripts/validate-data.js  validates published question banks and media links during build
```

## Question-bank conventions

- General subject banks are JSON files referenced by `questionBank` or `questionBanks` in `src/data/subjects.ts`. Each bank lives in its own subfolder under `public/data` (e.g. `public/data/tu-tuong-hcm/`, `public/data/tadv/`); TADV media paths inside those JSON files are relative to `/data` and include the subfolder (e.g. `tadv/audio_part_1_listening.mp3`).
- The optional manual source mirror lives in the repository root: `sync:data` copies `data/General/<subject>/**` into `public/data/<subject>/` (preserving nested folders such as `triet-hoc-mac-lenin/{2tc,3tc}`) and maps `data/Major/*.json` through `scripts/sync-data.js`.
- TOEIC banks live under `public/data/toeic-test/Test-XX/PartN/`.
- Each TOEIC JSON file must match its folder part. The loader validates the required question text, options shape, and answer fields at runtime.
- Parts 1, 2 and 5 are arrays of questions; Parts 3, 4 and 6 are arrays of groups; Part 7 is an object with `groups`.
- Relative media names (`audio`, `image`) are resolved from the bank file's directory. Keep media and its JSON bank together.
- Update the counts, file paths, and metadata together in `src/data/toeic.ts`; do not rely on a count inferred from the UI.

## Testing

Tests are colocated with the logic they protect. The suite covers answer mapping/scoring, question-bank loading and validation, TOEIC schema adaptation, persisted practice sessions, navigation and chapter filters. Add a regression test whenever a bank format or filtering rule changes.

`npm run validate:data` is also part of the production build. It checks JSON structure, declared question/part counts, duplicate IDs within a question group, multiple-choice answers, and referenced audio/image files.

## Deployment

Vercel builds with `npm run build` and serves `dist/`; SPA rewrites are configured in `vercel.json`. Static question banks and media are public assets, so they must not contain secrets or access-controlled material. Use a backend and authenticated URLs if protected content is required.

