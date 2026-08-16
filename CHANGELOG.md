# [0.4.0](https://github.com/lakardion/wanikani-sdk/compare/v0.3.0...v0.4.0) (2026-08-16)

### Features

- lossless schemas — looseObject passthrough + structured metadata ([#16](https://github.com/lakardion/wanikani-sdk/issues/16)) ([65200d2](https://github.com/lakardion/wanikani-sdk/commit/65200d20893e812699ee63730ecfb5289b05b612)), closes [#10](https://github.com/lakardion/wanikani-sdk/issues/10)
- onUnknownFields option for detecting unknown API fields ([#17](https://github.com/lakardion/wanikani-sdk/issues/17)) ([aabdf58](https://github.com/lakardion/wanikani-sdk/commit/aabdf58effa6bde7bc7b7387d8fed9ab04ac9e6f)), closes [#14](https://github.com/lakardion/wanikani-sdk/issues/14)

# [0.3.0](https://github.com/lakardion/wanikani-sdk/compare/v0.2.0...v0.3.0) (2026-08-05)

### Features

- **release:** replace changesets with semantic-release + OIDC trusted publishing ([#5](https://github.com/lakardion/wanikani-sdk/issues/5)) ([c65a1bb](https://github.com/lakardion/wanikani-sdk/commit/c65a1bb4a27ae003a1fbdb6497c0cd87c5bcb97e))

# wanikani-sdk

## 0.2.0

### Minor Changes

- af9c143: Documentation: add npm version / CI / license badges at the top of the README, a pre-1.0 stability callout setting consumer expectations, and an explicit Roadmap section documenting deferred items (SRS-mutating writes, per-resource `If-Modified-Since` arguments, built-in caching). No API changes.

## 0.1.0

### Minor Changes

- Initial typed SDK for WaniKani v2. valibot-validated input/output for every resource, namespaced client (`client.subjects.list(...)`, `client.user.get()`, etc.), built-in 60 req/min token-bucket rate limiter, strict one-retry policy on 429/503/network errors, conditional-request plumbing (`If-Modified-Since` / `If-None-Match`). v1 surface covers all GET endpoints plus safe writes (`PUT /user` preferences, `POST`/`PUT` study_materials); SRS-mutating writes (`POST /reviews`, `PUT /assignments/:id/start`) are intentionally deferred.

## 0.0.1

### Patch Changes

- bce4962: Initial version
