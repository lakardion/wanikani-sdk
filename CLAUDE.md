# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (CI pins v7, Node 16.x).

- `pnpm test` — run vitest once (CI mode)
- `pnpm test:dev` — vitest watch mode
- `pnpm vitest run path/to/file.test.ts -t "name"` — run a single test
- `pnpm lint` — type-check only (`tsc --noEmit`); there is no ESLint
- `pnpm build` — `tsup src/index.ts --format cjs,esm --dts` → emits `dist/index.{js,mjs,d.ts}`
- `pnpm ci` — lint + test + build (what CI runs)
- `pnpm run release` — runs `ci` then `changeset publish` (used by the publish workflow, not run locally)

## Architecture

Single-entry TypeScript SDK. Public surface is whatever `src/index.ts` exports; `tsup` builds it into the `dist/` shapes referenced by `package.json` (`main`/`module`/`types`). Adding a new public API means exporting it from `src/index.ts` — there is no barrel-of-barrels layer.

`tsconfig.json` is `noEmit: true` because tsup owns emission. It also enables `noUncheckedIndexedAccess`, so array/record access returns `T | undefined` — handle that at the call site rather than asserting.

## Releases

Versioning and publishing go through **Changesets**, not manual `npm version`:

1. Add a changeset for user-visible changes: `pnpm changeset` (writes a markdown file under `.changeset/`).
2. Merging to `main` triggers `.github/workflows/publish.yml`, which either opens a "Version Packages" PR or, if such a PR is already merged, runs `pnpm run release` to publish to npm.
3. `.changeset/config.json` sets `access: "public"` — packages publish publicly by default.

CI (`.github/workflows/main.yml`) runs lint → test → build on PRs to any branch and pushes to `main`.
