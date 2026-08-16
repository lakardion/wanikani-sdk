# 0005. Composite helpers stay validator-free; sync via `updated_after` watermarks

- **Status:** Accepted

## Context

ADR-0003's composite helpers make **multiple requests per call** (e.g. `learnedSubjects` = paginated assignments list → batched subjects fetch). ADR-0004's conditional requests are **per-request** and consumer-cached — one call, one request, one etag. Ticket #13 asked how the two meet: should helpers accept and return validators?

Threading validators through helpers would mean consumers storing N+M etags per helper call, where the N/M split is the SDK's internal request strategy — an implementation detail that would freeze into the public API. Meanwhile the helpers' core use case ("what changed since last sync?") is already served by the API's `updated_after` filter, which the composite tier builds on (`syncSince`): an unchanged resource returns a near-empty body, so an etag would save only that already-small payload.

## Decision

The composite tier carries **no validator parameters and no etag maps** in its return types. Validators remain a resource-tier tool (ADR-0004). Change detection on the composite tier uses `updated_after` **watermarks** (`syncSince(since)` → `fetchedAt` becomes the next watermark).

Consumers who want a cheap unchanged-check around a helper compose the **gate pattern**: one conditional resource-tier `list()` in front of the helper call — a 304 skips the join entirely; a fresh response's etag becomes the next stored validator. This pattern ships as the documented recipe in the composite tier's docs.

Alternatives rejected: validators on `syncSince` only (complexity to save a near-empty body); full per-request threading (leaks join internals).

## Consequences

- The helper API stays clean; internal request strategies (pagination, batching) can change without breaking consumers' cache bookkeeping.
- Consumers wanting etag savings around helpers write the ~5-line gate pattern themselves.
- The tiers are fully orthogonal: resource tier = faithful transport + validators; composite tier = joins + watermarks.
