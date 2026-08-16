/**
 * PROTOTYPE — throwaway interface sketch for ticket #9. NOT production code.
 *
 * Question being answered: per ADR-0004 (transport-level conditional requests,
 * consumer owns the cache), what does the conditional-request surface look like
 * on the public API?
 *
 * Grounding in the current code (src/http/transport.ts):
 *  - `RequestOptions` already accepts `ifNoneMatch` / `ifModifiedSince`, and
 *    `buildInit` already sends the headers — but no resource method passes them.
 *  - `attempt()` sees the 304 and `request()` throws `WanikaniNotModified` —
 *    but it DISCARDS response headers, so ETag/Last-Modified never escape.
 *  - So the real change is: `attempt()` captures validators on 2xx and 304,
 *    and the resource layer wraps results when the caller opted in.
 *
 * React-to decisions are marked ⚡ throughout.
 *
 * Verify: `bunx tsc --noEmit`.
 */

import type { SubjectCollection, SubjectEnvelope, ListSubjectsInput } from "../schemas/subject";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * Validators echoed back from previous responses. The consumer stores these
 * alongside its cached data (ADR-0004: consumer owns the cache).
 *
 * ⚡ `ifModifiedSince` accepts a `Date` (formatted to HTTP-date via
 * `toUTCString()`) or a raw string (echo of a `Last-Modified` value).
 * String-only would be more faithful; Date is friendlier. Sketch takes both.
 */
export interface CacheValidators {
  /** ETag from a previous response to the same request. */
  ifNoneMatch?: string;
  /** Last-Modified from a previous response, or any point in time. */
  ifModifiedSince?: Date | string;
}

/** 200 with a fresh body — plus the validators to store for next time. */
export interface Fresh<T> {
  notModified: false;
  data: T;
  etag: string | null;
  lastModified: string | null;
}

/**
 * 304 — the cached copy is still good.
 *
 * ⚡ DECISION POINT: discriminated result vs. throwing. Sketch uses a result:
 * a 304 in a sync loop is the EXPECTED outcome, not an error, and
 * try/catch-as-control-flow makes the consumer's happy path the catch branch.
 * Consequence: `WanikaniNotModified` (currently exported, thrown, unreachable)
 * becomes fully unused — see deprecation note below.
 */
export interface NotModified {
  notModified: true;
  /** 304 responses may still carry an ETag; surfaced if present. */
  etag: string | null;
}

export type ConditionalResponse<T> = Fresh<T> | NotModified;

// ---------------------------------------------------------------------------
// Resource surface — shown on subjects, identical pattern on all 10 resources
// ---------------------------------------------------------------------------

/**
 * ⚡ DECISION POINT: opt-in overloads (this sketch) vs. universal wrapper.
 *
 * Opt-in overloads: plain calls keep today's return types untouched; passing
 * validators switches the return to the wrapper. NON-BREAKING (minor bump).
 *
 * Universal wrapper: every method always returns `ConditionalResponse<T>`.
 * Uniform, one code path — but BREAKING for all consumers. At the current
 * 0.3.0, semantic-release would cut this as **v1.0.0**. Sketch rejects it:
 * don't force a 1.0 (or break consumers) for a feature most calls won't use.
 */
export interface SubjectsResourceSketch {
  // Plain calls — unchanged signatures, unchanged return types.
  get(id: number): Promise<SubjectEnvelope>;
  list(input?: ListSubjectsInput): Promise<SubjectCollection>;

  // Conditional calls — opted into by passing validators.
  get(id: number, validators: CacheValidators): Promise<ConditionalResponse<SubjectEnvelope>>;
  list(
    input: ListSubjectsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<SubjectCollection>>;

  /**
   * ⚡ paginate is EXCLUDED from conditional support. Rationale: a paginated
   * walk is many requests with no single validator that means "the whole
   * collection is unchanged", and an async generator has no clean channel to
   * signal "nothing to yield". For change detection on collections, the API's
   * own answer is `updated_after` (already supported); for a cheap
   * unchanged-check, `list()` page 1 with validators does the job — a 304
   * there means the collection's `data_updated_at` hasn't moved.
   */
  // paginate(input?: ListSubjectsInput): AsyncGenerator<SubjectCollection>  // unchanged
}

// ---------------------------------------------------------------------------
// Intended consumer pattern — the client app's sync loop
// ---------------------------------------------------------------------------
//
//   const cached = store.get("kanji-subjects"); // { data, etag, lastModified }
//
//   const res = await client.subjects.list({ types: ["kanji"] }, {
//     ifNoneMatch: cached?.etag,           // If-None-Match wins over
//     ifModifiedSince: cached?.lastModified, // If-Modified-Since when both sent
//   });
//
//   if (res.notModified) {
//     return cached.data;                   // 304: cheap, no body transferred
//   }
//   store.set("kanji-subjects", {
//     data: res.data,
//     etag: res.etag,
//     lastModified: res.lastModified,
//   });
//   return res.data;
//
// ---------------------------------------------------------------------------
// Housekeeping implied by this design:
//
//  - `WanikaniNotModified` (src/http/errors.ts): kept exported for compat but
//    no longer thrown by anything public — mark @deprecated. Removal is a
//    breaking change for whenever a major bump happens anyway.
//  - Transport internals: `attempt()` grows `etag`/`lastModified` capture on
//    2xx + 304; `request()` returns them alongside the body instead of
//    throwing on `not_modified`. Resource layer decides wrap-vs-unwrap based
//    on whether validators were passed.
//  - Fog note for the map: how validators thread through COMPOSITE helpers
//    (multi-request aggregates) is still open — deliberately not settled here.
// ---------------------------------------------------------------------------
