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
npm run clean        # remove the generated dist/ directory
npm run build        # validate data, typecheck, and build dist/
npm run preview      # serve dist/ locally
```

## AI codebase memory

This repository includes a project-scoped OpenCode MCP configuration for
[`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp). It
indexes the code locally and gives the AI agent structural search, call-graph,
architecture, and impact-analysis tools without uploading source code.

Requirements:

- Node.js 22 or later
- npm 10 or later
- OpenCode with MCP support

Start OpenCode from the repository root, then restart it after changing
`opencode.json`. On first use, ask the agent to index the project. The local
index is stored in the git-ignored `.codebase-memory/` directory.

The MCP server is restricted to this repository through `CBM_ALLOWED_ROOT`.
If the repository is moved, update that path in `opencode.json`.

## Project structure

```text
src/
  app/                application layout
  components/         reusable and feature-level UI
  data/               subject catalogues and client-side metadata
  features/quiz/      quiz domain model, loaders, adapters, and UI
  pages/              route-level screens
  security/           client-side interaction controls
public/              static web assets (logo, favicon)
r2-banks/data/       free-subject question banks — git mirror of the R2 bucket objects (`data/` key prefix)
scripts/validate-data.js  validates question banks and media links during build
```

## Question-bank conventions

- Question banks are NOT shipped with the website. Free-subject banks live in `r2-banks/data/` (git mirror) and are uploaded to the public R2 bucket (`data/` key prefix); at runtime `toBankUrl` in `src/lib/mediaUrl.ts` maps the logical `/data/...` paths declared in `src/data/subjects.ts`, `tadvExams.ts`, and `toeic.ts` onto the R2 base URL.
- Paid-subject banks live in the private Supabase Storage bucket `paid-question-banks` and are served through the `get-paid-question-bank` edge function (auth + purchase + rate limits). They never touch the web host.
- TADV media paths inside bank JSON files stay relative (e.g. `tadv/test01/part1-audio.mp3`); `toMediaUrl` in `src/lib/mediaUrl.ts` serves TADV audio/images, TOEIC audio/images (`toeic-test/` → `toeic/`), kinh_te_vi_mo images, and the hero videos from R2, flattening `part5-image-testN/` folders. Every media reference must be R2-hosted or an absolute URL; `validate-data` fails otherwise.
- TOEIC free banks are mirrored under `r2-banks/data/toeic-test/Test-XX/PartN/` (R2 key `data/toeic-test/...`).
- Each TOEIC JSON file must match its folder part. The loader validates the required question text, options shape, and answer fields at runtime.
- Parts 1, 2 and 5 are arrays of questions; Parts 3, 4 and 6 are arrays of groups; Part 7 is an object with `groups`.
- Relative media names (`audio`, `image`) are resolved from the bank file's directory, then rewritten to R2.
- Update the counts, file paths, and metadata together in `src/data/toeic.ts`; do not rely on a count inferred from the UI.

## Testing

Tests are colocated with the logic they protect. The suite covers answer mapping/scoring, question-bank loading and validation, TOEIC schema adaptation, persisted practice sessions, navigation and chapter filters. Add a regression test whenever a bank format or filtering rule changes.

`npm run validate:data` is also part of the production build. It checks JSON structure, declared question/part counts, duplicate IDs within a question group, multiple-choice answers, and referenced audio/image files.

## Deployment

Vercel builds with `npm run build` and serves `dist/`; SPA rewrites are configured in `vercel.json`. Static question banks and media are public assets, so they must not contain secrets or access-controlled material. Use a backend and authenticated URLs if protected content is required.
