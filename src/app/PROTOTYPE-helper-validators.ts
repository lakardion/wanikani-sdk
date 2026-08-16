/**
 * PROTOTYPE — throwaway interface sketch for ticket #13. NOT production code.
 *
 * Question being answered: how do conditional-request validators (ADR-0004,
 * sketched in #9) thread through the composite helpers (ADR-0003, sketched
 * in #8)? A helper makes MULTIPLE requests per call; validators are
 * per-request and consumer-cached. Where do they meet?
 *
 * ⚡ THE SKETCH'S RECOMMENDATION: they don't. Helpers stay validator-free.
 *
 * Three reasons:
 *
 * 1. The join internals leak. `learnedSubjects` = assignments list (paginated,
 *    N requests) → subjects list (batched by ids, M requests). Exposing
 *    validators means the consumer manages N+M etags per helper call — and the
 *    N/M split is an implementation detail we'd be freezing into the API.
 *
 * 2. The use case is already covered. Helpers exist to answer "what changed /
 *    what do I sync", and the API's own answer for that is `updated_after` —
 *    which the composite tier already builds on (`syncSince(since)` watermark
 *    pattern, approved in #8). A sync where nothing changed returns tiny,
 *    near-empty collections; an etag would save only that already-small body.
 *
 * 3. The genuinely valuable conditional case composes WITHOUT threading: use a
 *    resource-tier conditional call as a freshness GATE before the helper
 *    (pattern below). One etag, no internals leaked, full savings.
 *
 * Verify: `bunx tsc --noEmit`.
 */

// Minimal local copies of the #9 sketch's types (that branch is separate;
// both are throwaway). See prototype/conditional-requests for the real ones.
interface CacheValidators {
  ifNoneMatch?: string;
  ifModifiedSince?: Date | string;
}
import type { AssignmentCollection, ListAssignmentsInput } from "../schemas/assignment";

// ---------------------------------------------------------------------------
// The interface change: none.
// ---------------------------------------------------------------------------

/**
 * `WanikaniApp` (see PROTOTYPE-helpers.ts) keeps its approved shape:
 * no `CacheValidators` parameter on any helper, no validator maps in any
 * aggregate return type.
 *
 * The two tiers stay orthogonal:
 *  - Resource tier: faithful transport + per-request validators (#9).
 *  - Composite tier: joins + watermark sync (#8), no validators.
 */

// ---------------------------------------------------------------------------
// The composition pattern: resource-tier conditional as a freshness GATE
// ---------------------------------------------------------------------------

/**
 * "Are my learned subjects stale?" — one conditional call gates one helper
 * call. The gate's etag represents the collection's `data_updated_at`; when
 * the gate 304s, NOTHING the helper would join has changed.
 */
async function getLearnedKanji(
  client: {
    assignments: {
      list(
        input: ListAssignmentsInput | undefined,
        validators: CacheValidators,
      ): Promise<
        | { notModified: true; etag: string | null }
        | { notModified: false; data: AssignmentCollection; etag: string | null }
      >;
    };
    app: {
      learnedSubjects(filter?: {
        types?: ("radical" | "kanji" | "vocabulary" | "kana_vocabulary")[];
      }): Promise<unknown[]>;
    };
  },
  store: {
    get(): { etag: string; learned: unknown[] } | undefined;
    set(value: { etag: string | null; learned: unknown[] }): void;
  },
): Promise<unknown[]> {
  const cached = store.get();

  const gate = await client.assignments.list(
    { started: true },
    { ifNoneMatch: cached?.etag },
  );

  if (gate.notModified) {
    return cached!.learned; // nothing changed — helper call skipped entirely
  }

  const learned = await client.app.learnedSubjects({ types: ["kanji"] });
  store.set({ etag: gate.etag, learned }); // gate's fresh etag = next validator
  return learned;
}

// ---------------------------------------------------------------------------
// ⚡ Alternatives considered — react to these:
//
// (B) Validators on `syncSince` ONLY (it IS the sync entry point):
//       syncSince(since, { validators: { assignments: {...}, subjects: {...} } })
//       → per-resource ConditionalResponse, 304 = that resource unchanged.
//     Rejected in this sketch: `updated_after` already returns a near-empty
//     body for unchanged resources, so the etag saves almost nothing — while
//     doubling syncSince's signature and return complexity.
//
// (C) Full per-request validator threading on every helper.
//     Rejected: leaks the join internals (reason 1) for no new capability
//     beyond what the gate pattern already gives.
//
// If (A — this sketch) is approved, ticket resolved with NO interface work:
// the decision lands as documentation on the composite tier ("validators are
// a resource-tier tool; use a conditional list() as a gate") plus the gate
// pattern in the helpers' docs.
// ---------------------------------------------------------------------------

export { getLearnedKanji };
