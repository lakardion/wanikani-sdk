# Contributing

## Commit messages are the versioning

Every merge to `main` runs semantic-release (`.github/workflows/release.yml`),
which derives the version bump, changelog, git tag, GitHub Release, and npm
publish **from commit messages alone**. PR titles too — squash merges turn the
title into the commit, so the PR title must follow the convention. Retitle a PR
before merging if it doesn't.

| Commit                                      | Bump       |
| ------------------------------------------- | ---------- |
| `fix: …`                                    | patch      |
| `perf: …`                                   | patch      |
| `feat: …`                                   | minor      |
| `feat!: …` / `BREAKING CHANGE:` in the body | major      |
| anything else (`chore:`, `docs:`, `ci:`, …) | no release |

Rules:

- **Squash-merge only.** The PR title is the commit message.
- Never edit `package.json`'s `version` field or `CHANGELOG.md` by hand —
  semantic-release owns both.
- Never publish from a local machine. Releases happen only via the workflow,
  authenticated with npm trusted publishing (OIDC) — there are no tokens.
