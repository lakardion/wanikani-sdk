# wanikani-sdk

[![npm version](https://img.shields.io/npm/v/wanikani-sdk.svg)](https://www.npmjs.com/package/wanikani-sdk)
[![CI](https://github.com/lakardion/wanikani-sdk/actions/workflows/main.yml/badge.svg)](https://github.com/lakardion/wanikani-sdk/actions/workflows/main.yml)
[![license](https://img.shields.io/npm/l/wanikani-sdk.svg)](./LICENSE)

Typed, runtime-validated TypeScript SDK for the [WaniKani v2 API](https://docs.api.wanikani.com/20170710/).

Schemas are defined with [valibot](https://valibot.dev) and serve as the single source of truth for both compile-time types and runtime validation of inputs and outputs. Includes a built-in 60 req/min rate limiter and a strict one-retry policy on transient failures to keep API keys out of trouble.

> **Status:** API is pre-1.0; minor versions may introduce breaking changes until 1.0.0.

## Install

```sh
bun add wanikani-sdk
# or
npm install wanikani-sdk
```

Requires Node 18+ / Bun / modern browsers / Workers (uses native `fetch`).

## Quick start

```ts
import { WanikaniClient } from "wanikani-sdk";

const client = new WanikaniClient({ apiKey: process.env.WANIKANI_API_KEY });

const me = await client.user.get();
console.log(me.data.username, "is level", me.data.level);

for await (const page of client.subjects.paginate({ types: ["kanji"], levels: [1] })) {
  for (const env of page.data) console.log(env.id, env.data.characters);
}
```

If no `apiKey` is passed, the client reads `WANIKANI_API_KEY` from the environment.

## Configuration

Every option on `new WanikaniClient(options)`:

```ts
new WanikaniClient({
  apiKey: string, // default: process.env.WANIKANI_API_KEY
  revision: "20170710", // default; pin to a docs revision
  baseUrl: string, // default: "https://api.wanikani.com/v2/"
  fetch: typeof fetch, // default: globalThis.fetch
  rateLimit: { rpm: 60 }, // default; set `false` to disable client-side limiting
  validate: "both", // default; "input" | "output" | "none"
});
```

| Option      | What it does                                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`    | Personal Access Token for the WaniKani account. Falls back to `process.env.WANIKANI_API_KEY`; constructor throws synchronously if neither is set.                                                                |
| `revision`  | Sent as the `Wanikani-Revision` header. Only change this if you've migrated to a newer docs revision.                                                                                                            |
| `baseUrl`   | Override for tests or proxies. Trailing slash auto-added.                                                                                                                                                        |
| `fetch`     | Inject a custom fetch — useful for instrumentation, retries beyond the built-in policy, or running in environments that don't expose a global `fetch`.                                                           |
| `rateLimit` | Token bucket sized to `rpm` tokens, refilled at `rpm/60`/sec. `false` skips the limiter (don't do this against the real API).                                                                                    |
| `validate`  | `both` parses inputs and outputs through valibot. `output` only checks responses (still gives you types but trusts your inputs). `input` only checks request bodies. `none` skips both — fastest, no safety net. |

### Retry policy (non-configurable)

A failed request retries **at most once**, only for clearly transient signals:

- **429**: sleep until `RateLimit-Reset`, retry once. A second 429 throws `WanikaniRateLimitError`.
- **503**: 2-second backoff, retry once.
- **Network errors** (fetch rejection): retry once.

Deterministic 4xx (401, 403, 404, 409, 422) and 500 are **never** retried — retrying them risks getting the API key banned.

## Resources

Every resource hangs off a configured `WanikaniClient` instance.

| Resource                                              | GET                                        | POST / PUT                         |
| ----------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| [`user`](#user)                                       | `.get()`                                   | `.update(prefs)`                   |
| [`summary`](#summary)                                 | `.get()`                                   | —                                  |
| [`subjects`](#subjects)                               | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |
| [`assignments`](#assignments)                         | `.get(id)`, `.list(...)`, `.paginate(...)` | _(start: deferred)_                |
| [`reviewStatistics`](#reviewstatistics)               | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |
| [`studyMaterials`](#studymaterials)                   | `.get(id)`, `.list(...)`, `.paginate(...)` | `.create(...)`, `.update(id, ...)` |
| [`levelProgressions`](#levelprogressions)             | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |
| [`resets`](#resets)                                   | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |
| [`spacedRepetitionSystems`](#spacedrepetitionsystems) | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |
| [`voiceActors`](#voiceactors)                         | `.get(id)`, `.list(...)`, `.paginate(...)` | —                                  |

### Roadmap

Known deferrals — these will land in later 0.x releases:

- `POST /reviews` (submit a review) and `PUT /assignments/:id/start` — intentionally not exposed yet to avoid accidentally advancing SRS state on real accounts.
- Per-resource `If-Modified-Since` / `If-None-Match` arguments. Today the transport supports conditional requests end-to-end but the resource methods don't yet take the headers as a parameter; see [Conditional requests](#conditional-requests).
- A built-in caching layer on top of the conditional-request plumbing.

### `user`

```ts
const me = await client.user.get();
console.log(me.data.username, me.data.level, me.data.subscription.type);

// Update preferences (the only mutable user fields)
await client.user.update({
  preferences: { reviews_autoplay_audio: true, lessons_batch_size: 5 },
});
```

### `summary`

```ts
const summary = await client.summary.get();
console.log(summary.data.lessons.length, "lesson buckets ready");
console.log("next reviews at:", summary.data.next_reviews_at);
```

### `subjects`

```ts
// Single subject by id
const kanji = await client.subjects.get(440);

// One page (default per_page is 1000 for subjects)
const radicals = await client.subjects.list({ types: ["radical"], levels: [1, 2] });

// Stream every page
for await (const page of client.subjects.paginate({ types: ["kanji"] })) {
  for (const env of page.data) {
    // env.data is a Radical | Kanji | Vocabulary | KanaVocabulary discriminated by env.object
  }
}
```

### `assignments`

```ts
const review = await client.assignments.list({
  immediately_available_for_review: true,
});
console.log("ready to review:", review.total_count);
```

### `reviewStatistics`

```ts
const weak = await client.reviewStatistics.list({
  percentages_less_than: 60,
  subject_types: ["kanji"],
});
```

### `studyMaterials`

```ts
// Add a synonym + meaning note
const created = await client.studyMaterials.create({
  subject_id: 440,
  meaning_synonyms: ["one (counter)"],
  meaning_note: "Use for counting flat objects.",
});

// Update later
await client.studyMaterials.update(created.id, {
  meaning_synonyms: ["one (counter)", "single"],
});
```

### `levelProgressions`

```ts
const progressions = await client.levelProgressions.list();
console.log("current level started at:", progressions.data.at(-1)?.data.unlocked_at);
```

### `resets`

```ts
const resets = await client.resets.list();
console.log(resets.total_count, "total resets on this account");
```

### `spacedRepetitionSystems`

```ts
const srs = await client.spacedRepetitionSystems.get(1);
for (const stage of srs.data.stages) {
  console.log("stage", stage.position, "→", stage.interval, stage.interval_unit);
}
```

### `voiceActors`

```ts
const actors = await client.voiceActors.list();
for (const env of actors.data) console.log(env.data.name, env.data.gender);
```

## Composite helpers (`client.app`)

A second tier beside the faithful resource namespaces (ADR-0003): app-level joins across resources. Every helper paginates fully under the hood — a call means "all matching pages", never page 1 — and batched `subjects?ids=…` / `*?subject_ids=…` lookups are chunked internally to stay under URL length limits.

Filters are camelCase here (the resource tier stays snake_case) and each field maps to a server-side query param wherever one exists — `types` → `subject_types`, `srsStages` → `srs_stages`, `updatedAfter` → `updated_after`, `availableBefore` → `available_before`. The one documented exception is `reviewsDue`'s `limit`, which truncates the joined result client-side (there's no API equivalent).

```ts
// Everything I've started learning (assignments?started=true joined with subjects)
const learned = await client.app.learnedSubjects({ types: ["kanji"], levels: [1, 2, 3] });

// What can be learned right now
const queue = await client.app.lessonQueue({ types: ["kanji"] });

// Tonight's review session — reviewStatistic is null before the first review
const due = await client.app.reviewsDue({ limit: 20 });
// …or forecast: everything due by a timestamp
const soon = await client.app.reviewsDue({ availableBefore: in24h });

// The "learning card" for arbitrary subjects — at least one filter field is
// REQUIRED (no fetch-all): subjectProgress({}) is a compile-time error.
// assignment / reviewStatistic / studyMaterial join as null when absent.
const cards = await client.app.subjectProgress({ slugs: ["suru", "life"] });

// Current level standing + the kanji gate (assignment null = still locked)
const status = await client.app.levelStatus(); // defaults to your current level

// Login sync: parallel updated_after across the mutable resources
const delta = await client.app.syncSince(lastLoginAt);
save({ ...delta, lastLoginAt: delta.fetchedAt });
// Only some resources? The result type carries only those keys:
const partial = await client.app.syncSince(lastLoginAt, { resources: ["assignments"] });
```

### Change detection: the gate pattern

Helpers take no validator (etag / `If-Modified-Since`) params — the composite tier stays validator-free per ADR-0005. To cheaply skip a join when nothing changed, put one resource-tier `list()` probe in front of the helper. Once per-resource conditional requests land (see [Conditional requests](#conditional-requests)), the probe is a conditional `list()` whose 304 (`WanikaniNotModified`) skips the helper entirely; today, an `updated_after` watermark probe serves the same role:

```ts
const probe = await client.assignments.list({ started: true, updated_after: lastSync });
if (probe.data.length === 0) return cached; // nothing changed — skip the join
const learned = await client.app.learnedSubjects();
```

For change detection proper, use the watermark flow: `syncSince(since)` → store the returned `fetchedAt` as the next `since`.

## Pagination

WaniKani uses cursor-based pagination (`page_after_id` / `page_before_id`). Each `.list(...)` returns a single page; `.paginate(...)` returns an `AsyncGenerator` that walks the `pages.next_url` chain until exhaustion.

```ts
// Eager: collect everything (large for /subjects — ~9000 items)
const all = [];
for await (const page of client.subjects.paginate()) all.push(...page.data);

// Lazy: stop early
for await (const page of client.assignments.paginate({ in_review: true })) {
  if (page.data.length === 0) break;
  process(page.data);
}
```

`per_page` is controlled by WaniKani (500 for most resources, 1000 for `/subjects` and `/reviews`). The SDK doesn't override it.

## Conditional requests

Every `get`/`list` method accepts an optional trailing `CacheValidators` argument: `ifNoneMatch` (an ETag) and `ifModifiedSince` (a `Date` or raw `Last-Modified` string). Passing it switches the return type to `ConditionalResponse<T>` — a 200 gives you `{ notModified: false, data, etag, lastModified }`, a 304 gives you `{ notModified: true }`. You own the cache: store the validators alongside your data and echo them back next time. When both are sent, `If-None-Match` wins (per the API).

```ts
const res = await client.subjects.list({ types: ["kanji"] }, { ifNoneMatch: cached?.etag });

if (res.notModified) {
  // Nothing changed — keep using the cache; no body was transferred.
} else {
  cache.write(res.data, { etag: res.etag, lastModified: res.lastModified });
}
```

`paginate` is excluded from conditional support. For change detection on collections, prefer the `updated_after` filter — it returns only records changed since a timestamp, which is the API's recommended sync pattern.

## Errors

All errors extend `WanikaniError`:

- `WanikaniApiError` — non-2xx HTTP response. Carries `status`, `code`, `url`.
- `WanikaniRateLimitError` — 429 after the single allowed retry. Carries the `RateLimit-Reset` epoch as `resetAt: Date | null`.
- `WanikaniValidationError` — request input or response payload failed valibot validation. Carries `direction: "input" | "output"` and the raw `issues` from valibot.

```ts
import { WanikaniApiError, WanikaniRateLimitError } from "wanikani-sdk";

try {
  await client.user.get();
} catch (err) {
  if (err instanceof WanikaniRateLimitError) console.warn("retry after", err.resetAt);
  else if (err instanceof WanikaniApiError && err.status === 403) {
    console.error("account hibernating or token revoked");
  } else throw err;
}
```

## Browser usage

WaniKani's API does not advertise CORS for arbitrary browser origins. Call this SDK from a server-side route, edge function, or proxy — not from page JS.

## License

ISC
