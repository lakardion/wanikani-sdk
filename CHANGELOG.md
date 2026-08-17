# [1.0.0](https://github.com/lakardion/wanikani-sdk/compare/v0.5.0...v1.0.0) (2026-08-17)

- feat!: conditional requests on resource methods (ETag/If-None-Match, 304 results) ([#21](https://github.com/lakardion/wanikani-sdk/issues/21)) ([766081e](https://github.com/lakardion/wanikani-sdk/commit/766081e462ce7afda69f7ed4a138e6af96a73c5d)), closes [#9](https://github.com/lakardion/wanikani-sdk/issues/9) [#19](https://github.com/lakardion/wanikani-sdk/issues/19)

### BREAKING CHANGES

- WanikaniNotModified is removed from the public API.
  A 304 from a conditional request is now only surfaced as
  { notModified: true } via ConditionalResponse (ADR-0004).

- fix: unwrap TransportResult in levelStatus after main merge

The helpers module was written against the pre-conditional-requests
transport, where request() returned the bare body. Align the one direct
call site with the unwrapBody() pattern used by the resources.

# [0.5.0](https://github.com/lakardion/wanikani-sdk/compare/v0.4.0...v0.5.0) (2026-08-17)

### Features

- client.app composite helpers (learnedSubjects, lessonQueue, reviewsDue, subjectProgress, levelStatus, syncSince) ([#22](https://github.com/lakardion/wanikani-sdk/issues/22)) ([390e586](https://github.com/lakardion/wanikani-sdk/commit/390e5869013f13a915c457d6e381e961e74368b8))

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
