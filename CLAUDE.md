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
- `bun run release` — invoked by the publish workflow only. **Do not run locally** (see Publishing).

## Architecture

Single-entry TypeScript SDK. Public surface is whatever `src/index.ts` exports; the `exports` map in `package.json` points consumers at `dist/index.{js,cjs,d.ts}`. Adding a new public API means exporting it from `src/index.ts` — there is no barrel-of-barrels layer.

`tsconfig.json` uses `moduleResolution: "Bundler"` + `verbatimModuleSyntax` + `isolatedModules`. Source files use bare relative imports (no `.js` extensions). Emission is owned by **`bun build`** (JS) and **`tsc -p tsconfig.build.json`** (`.d.ts` only). `noUncheckedIndexedAccess` is on — array/record access returns `T | undefined`; handle that at the call site rather than asserting.

Tests live under `test/`. Mocks come from `bun:test`'s `mock()`; the `mockFetch` / `mockRejectingFetch` helpers in `test/helpers.ts` wrap it with a per-call response queue. `bun:test` auto-loads `.env` — no dotenv setup file. The integration test in `test/integration.test.ts` is gated on `WANIKANI_API_KEY` via `describe.skipIf` and hits the live API once.

## Publishing — strict process

**Do not publish from a local machine.** All releases go through the wired CI flow in `.github/workflows/publish.yml`. Running `bun publish`, `npm publish`, `bun x changeset publish`, or `bun run release` locally bypasses the review checkpoints below and is treated as a bug, not a shortcut.

The correct flow per release:

1. **In a feature branch**, after the code change is ready, run:
   ```sh
   bun x changeset
   ```
   Pick the bump type (patch/minor/major) and write a user-facing summary. This creates `.changeset/<slug>.md`.
2. **Commit the changeset** along with the code change and open a normal PR. Reviewers see both the change and the proposed release note.
3. **Merge the PR to `main`.** This triggers `.github/workflows/publish.yml`. With a pending changeset present, the `changesets/action@v1` step opens a second PR titled **"Version Packages"** that bumps `package.json` `version`, regenerates `CHANGELOG.md`, and deletes the consumed `.changeset/<slug>.md`.
4. **Wait for the "Version Packages" PR to appear** (usually < 1 minute after merge). Review the diff — it should only be the version + CHANGELOG.
5. **Merge the "Version Packages" PR.** The workflow runs again; this time there are no pending changesets and the version is unpublished, so it executes `bun run release` → `changeset publish` → uploads the tarball to npm.

Never edit `package.json`'s `version` field by hand. Never edit `CHANGELOG.md` by hand. Changesets owns both.

### Prerequisites for the CI flow

- **`NPM_TOKEN`** repository secret must exist (Settings → Secrets → Actions). It must be a **granular access token** scoped to `wanikani-sdk` with **"2FA required" set to OFF** — npm publish over HTTP cannot satisfy a passkey/WebAuthn 2FA challenge, so the token must bypass 2FA. Create the token at `https://www.npmjs.com/settings/<user>/tokens`.
- `.changeset/config.json` already has `access: "public"` — the publish step needs no extra flags.

### When the CI flow is blocked

If something is genuinely wrong (broken action, registry outage, urgent rollback) and the CI publish can't proceed:

- Diagnose and fix the action / token / registry issue first.
- A manual local publish is the **last resort**, requires the user's explicit go-ahead in the conversation, and the same git artifacts (commit with version bump + CHANGELOG + matching git tag pushed to origin) must end up on `main` afterward to match what was shipped to npm.

## CI

`.github/workflows/main.yml` runs `format:check → lint → test → build` on PRs to any branch and pushes to `main`. Same bun setup as the publish workflow. No separate Node setup step.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
