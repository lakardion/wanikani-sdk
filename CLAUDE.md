# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Toolchain is **bun** (CI pins `latest` via `oven-sh/setup-bun@v2`). No pnpm, no npm scripts beyond what's invoked through `bun`.

- `bun test` — run the bun:test suite once
- `bun test --watch` (also `bun run test:dev`) — watch mode
- `bun test path/to/file.test.ts -t "name"` — run a single test
- `bun run lint` — `oxlint . && tsc` (lint + type-check; the SDK itself doesn't emit, see Architecture)
- `bun run lint:fix` — `oxlint . --fix`
- `bun run format` / `bun run format:check` — `oxfmt --write` / `oxfmt --check`
- `bun run build` — `bun run build:js` (bun bundler → cjs + esm) then `bun run build:types` (tsc → .d.ts under `dist/`)
- `bun run ci` — `format:check + lint + test + build`; what CI runs

## Architecture

Single-entry TypeScript SDK. Public surface is whatever `src/index.ts` exports; the `exports` map in `package.json` points consumers at `dist/index.{js,cjs,d.ts}`. Adding a new public API means exporting it from `src/index.ts` — there is no barrel-of-barrels layer.

`tsconfig.json` uses `moduleResolution: "Bundler"` + `verbatimModuleSyntax` + `isolatedModules`. Source files use bare relative imports (no `.js` extensions). Emission is owned by **`bun build`** (JS) and **`tsc -p tsconfig.build.json`** (`.d.ts` only). `noUncheckedIndexedAccess` is on — array/record access returns `T | undefined`; handle that at the call site rather than asserting.

Tests live under `test/`. Mocks come from `bun:test`'s `mock()`; the `mockFetch` / `mockRejectingFetch` helpers in `test/helpers.ts` wrap it with a per-call response queue. `bun:test` auto-loads `.env` — no dotenv setup file. The integration test in `test/integration.test.ts` is gated on `WANIKANI_API_KEY` via `describe.skipIf` and hits the live API once.

## Publishing — strict process

**Do not publish from a local machine.** All releases go through `.github/workflows/release.yml`, which runs **semantic-release** on every push to `main`. Running `bun publish`, `npm publish`, or `npx semantic-release` (outside `--dry-run`) locally bypasses the review checkpoints and is treated as a bug, not a shortcut.

There is no manual release step. The flow per release:

1. **Open a PR with a conventional title.** Commit messages are the versioning — see the bump table in `CONTRIBUTING.md` (`fix`/`perf` → patch, `feat` → minor, `!` or `BREAKING CHANGE` → major, anything else → no release).
2. **Squash-merge the PR to `main`.** The PR title becomes the commit message, so retitle before merging if it doesn't follow the convention.
3. **The release workflow does the rest**: runs the gates (`bun run ci`), computes the next version from commits since the last `v*` tag, prepends to `CHANGELOG.md`, commits the bump (`chore(release): X.Y.Z [skip ci]`), tags `vX.Y.Z`, opens a GitHub Release, and publishes to npm with provenance.

Never edit `package.json`'s `version` field by hand. Never edit `CHANGELOG.md` by hand. semantic-release owns both.

### Auth: npm trusted publishing (OIDC)

There is **no `NPM_TOKEN`** anywhere — `@semantic-release/npm` authenticates via the GitHub Actions OIDC token, matched against the trusted-publisher registration on npmjs.com (package → Settings → Publishing access). The registration names the exact workflow path `.github/workflows/release.yml`; **renaming the workflow file breaks publish auth**.

### When the CI flow is blocked

If something is genuinely wrong (broken action, registry outage, urgent rollback) and the CI publish can't proceed:

- Diagnose and fix the action / trusted-publisher registration / registry issue first.
- A manual local publish is the **last resort**, requires the user's explicit go-ahead in the conversation, and the same git artifacts (commit with version bump + CHANGELOG + matching `v*` git tag pushed to origin) must end up on `main` afterward to match what was shipped to npm.

## CI

`.github/workflows/main.yml` runs `format:check → lint → test → build` on PRs to any branch and pushes to `main`. Same bun setup as the release workflow.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
