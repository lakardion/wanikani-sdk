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
