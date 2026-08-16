# 0001. Exclude SRS-mutating endpoints — the SDK is a read-only mirror of learning state

- **Status:** Accepted
- **Date:** 2025-01 (declared during wayfinding for the client-app effort)

## Context

The SDK is being built toward full coverage of the WaniKani API v2 (revision 20170710) so a future client app can generate dynamic Japanese lessons from the user's WaniKani data. Two documented endpoints remain unimplemented:

- `POST /reviews` — creates a review, advancing/demoting the assignment's SRS stage on WaniKani itself.
- `PUT /assignments/{id}/start` — moves an assignment from the lesson queue to the review queue on WaniKani itself.

(The other two missing endpoints, `GET /reviews` and `GET /reviews/{id}`, are deprecated server-side: one always returns an empty collection, the other always 404s.)

Both unimplemented endpoints **mutate the user's learning state on WaniKani**. The client app's model is the opposite: it *reads* WaniKani state (subjects learned, SRS stages, statistics) and layers its own LLM-generated lessons on top, keeping its own progress. It will not act onto WaniKani.

## Decision

The SDK will not implement `POST /reviews` or `PUT /assignments/{id}/start`. The deprecated `GET /reviews` and `GET /reviews/{id}` stubs are also excluded — they are dead endpoints (empty collection / guaranteed 404).

Already-shipped write endpoints are unaffected: study-material create/update and user-preference update modify user-owned annotations and settings, not SRS learning state, and remain in scope.

## Consequences

- "Full coverage" for this SDK means **full read-side coverage** — all resources, filters, and fields readable; writes limited to annotations/preferences.
- If the client app ever wants a correct in-app answer to count as a WaniKani review (driving WaniKani's SRS from the app), this ADR must be reopened.
