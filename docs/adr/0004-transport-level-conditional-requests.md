# 0004. Conditional requests at the transport level; the consumer owns the cache

- **Status:** Accepted

## Context

WaniKani's best practices recommend conditional requests: every response carries `ETag`/`Last-Modified`, every endpoint accepts `If-None-Match`/`If-Modified-Since`, and unchanged data returns a cheap 304. The client app will re-sync WaniKani state on every login, where most data is unchanged — so this is the recommended sync pattern. The SDK's transport already half-supports it: it can send the conditional headers and throws `WanikaniNotModified` on 304, but no public method exposes any of it, and response ETag/Last-Modified headers are never surfaced.

The alternatives were: an SDK-managed cache (client silently revalidates and serves cached data — zero consumer effort, but makes the SDK stateful, grows memory over long sessions, and makes invalidation our problem), or a layered opt-in cache on top of the transport capability (most work).

## Decision

Conditional requests are exposed **at the transport level only**:

- Resource methods accept per-call conditional options (`ifNoneMatch`, `ifModifiedSince`).
- Responses surface `etag` / `lastModified` alongside data.
- A 304 is surfaced as a distinguishable outcome (exact shape — discriminated result vs. the existing `WanikaniNotModified` throw — is settled during interface design).

**The consumer owns the cache**: storing etags, deciding when to revalidate, and holding the data. The SDK stays stateless; no built-in cache layer.

## Consequences

- The SDK remains a faithful, stateless transport — no memory growth, no invalidation semantics to own.
- Every consumer that wants caching does the etag bookkeeping themselves (the client app will do it once, where it keeps its synced data).
- Composite helpers (ADR-0003) make multiple requests per call; how etag bookkeeping surfaces through them is a known open design question, tracked on the wayfinding map.
