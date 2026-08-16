/**
 * PROTOTYPE — throwaway interface sketch for ticket #8. NOT production code.
 *
 * Question being answered: what are the exact TypeScript shapes of the six
 * composite helpers approved in ADR-0003 — filter objects, aggregate return
 * types, and the namespace they hang off?
 *
 * Design rules from ADR-0003 this sketch follows:
 *  - Filters map to SERVER-SIDE query params wherever one exists
 *    (documented per field); client-side refinement only for derived criteria.
 *  - Helpers return JOINED AGGREGATES, not raw API envelopes… but the
 *    aggregates are built from the `*Envelope` types, because the envelope is
 *    where `id` and `data_updated_at` live (subject data has no id of its own).
 *  - Helpers paginate fully under the hood — every call below means "all
 *    matching pages", never page 1.
 *
 * React-to decisions are marked ⚡ throughout.
 *
 * Verify: `bunx tsc --noEmit` (this file type-checks against the real schemas).
 */

import type { AssignmentEnvelope } from "../schemas/assignment";
import type { Timestamp } from "../schemas/common";
import type { LevelProgressionEnvelope } from "../schemas/level-progression";
import type { ReviewStatisticEnvelope } from "../schemas/review-statistic";
import type { StudyMaterialEnvelope } from "../schemas/study-material";
import type { SubjectEnvelope, SubjectType } from "../schemas/subject";

// ---------------------------------------------------------------------------
// Shared filter primitives
// ---------------------------------------------------------------------------

/**
 * DECIDED (#8): camelCase on the composite tier, snake_case on the resource
 * tier — the convention drift signals the tier drift (ADR-0003), and this is a
 * TypeScript SDK.
 *
 * Every field here maps 1:1 to a server-side assignment query param.
 */
export interface AssignmentScope {
  /** → `subject_types` */
  types?: SubjectType[];
  /** → `levels` (1–60) */
  levels?: number[];
  /** → `srs_stages` (0–9) */
  srsStages?: number[];
  /** → `burned` */
  burned?: boolean;
  /** → `updated_after` */
  updatedAfter?: Timestamp;
}

// ---------------------------------------------------------------------------
// 1. learnedSubjects — "everything I've started learning"
//    assignments?started=true (+scope)  →  subjects?ids=…
// ---------------------------------------------------------------------------

export interface LearnedSubject {
  subject: SubjectEnvelope;
  assignment: AssignmentEnvelope;
}

export type LearnedSubjectsFilter = AssignmentScope;

// ---------------------------------------------------------------------------
// 2. lessonQueue — what can be learned right now
//    assignments?immediately_available_for_lessons=true  →  subjects?ids=…
// ---------------------------------------------------------------------------

export interface LessonQueueItem {
  subject: SubjectEnvelope;
  assignment: AssignmentEnvelope;
}

export interface LessonQueueFilter {
  /** → `subject_types` */
  types?: SubjectType[];
  /** → `levels` */
  levels?: number[];
}

// ---------------------------------------------------------------------------
// 3. reviewsDue — review session material
//    assignments?immediately_available_for_review=true  (default: due NOW)
//    or assignments?available_before=<availableBefore>   (forecast)
//    →  subjects?ids=…  +  review_statistics?subject_ids=…
// ---------------------------------------------------------------------------

export interface ReviewDue {
  subject: SubjectEnvelope;
  assignment: AssignmentEnvelope;
  /**
   * Null when the assignment is due for its FIRST review — review statistics
   * are only created after the first submitted review.
   */
  reviewStatistic: ReviewStatisticEnvelope | null;
}

export interface ReviewsDueFilter {
  /** → `subject_types` */
  types?: SubjectType[];
  /** → `levels` */
  levels?: number[];
  /**
   * → `available_before`. Omit for "due right now"
   * (`immediately_available_for_review=true`); pass a timestamp to forecast
   * (e.g. "everything due in the next 24h").
   */
  availableBefore?: Timestamp;
  /**
   * ⚡ CLIENT-SIDE: no API equivalent. Truncates the joined result (e.g. "give
   * me 20 items for a session"). Applied after fetching, in API order.
   */
  limit?: number;
}

// ---------------------------------------------------------------------------
// 4. subjectProgress — the "learning card" for arbitrary subjects
//    subjects(+filter)  →  assignments + review_statistics + study_materials
//    (all by subject_ids)
// ---------------------------------------------------------------------------

export interface SubjectProgress {
  subject: SubjectEnvelope;
  /** Null when the user hasn't unlocked this subject yet. */
  assignment: AssignmentEnvelope | null;
  /** Null until the first review of this subject. */
  reviewStatistic: ReviewStatisticEnvelope | null;
  /** Null when the user never created notes/synonyms for this subject. */
  studyMaterial: StudyMaterialEnvelope | null;
}

export interface SubjectProgressFilterBase {
  /** → subjects `ids`. The "get specific" escape hatch. */
  ids?: number[];
  /** → subjects `slugs` (e.g. `["suru", "life"]`). */
  slugs?: string[];
  /** → subjects `types` */
  types?: SubjectType[];
  /** → subjects `levels` */
  levels?: number[];
}

/** Requires at least one field of T to be present. */
type AtLeastOne<T> = {
  [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * DECIDED (#8): no fetch-all — at least one filter field is REQUIRED.
 * `subjectProgress({})` and `subjectProgress()` are compile-time errors.
 */
export type SubjectProgressFilter = AtLeastOne<SubjectProgressFilterBase>;

// ---------------------------------------------------------------------------
// 5. levelStatus — current level standing + the kanji gate
//    user  →  level_progressions  →  subjects?types=kanji&levels=[level]
//    →  assignments?subject_ids=…
// ---------------------------------------------------------------------------

export interface KanjiGateItem {
  subject: SubjectEnvelope;
  /** Null only if WaniKani hasn't created the assignment yet (locked kanji). */
  assignment: AssignmentEnvelope | null;
}

export interface LevelStatus {
  level: number;
  /** Null when no progression record exists for the level (edge cases, old accounts). */
  progression: LevelProgressionEnvelope | null;
  /**
   * The level's kanji and where each stands. Level-up requires ~90% of these
   * to reach the SRS passing stage — the unsorted list lets the app decide
   * how to present "what's left".
   */
  kanjiGate: KanjiGateItem[];
}

export interface LevelStatusFilter {
  /** Defaults to the user's current level (from `GET /user`). */
  level?: number;
}

// ---------------------------------------------------------------------------
// 6. syncSince — the login sync (docs' best-practices scenario)
//    parallel updated_after=since across the mutable resources
// ---------------------------------------------------------------------------

export type SyncResource = "assignments" | "reviewStatistics" | "studyMaterials" | "subjects";

export interface SyncResult {
  /** Echo of the watermark that was requested. */
  since: Timestamp;
  /** When the sync ran — the consumer's next watermark. */
  fetchedAt: Timestamp;
  assignments: AssignmentEnvelope[];
  reviewStatistics: ReviewStatisticEnvelope[];
  studyMaterials: StudyMaterialEnvelope[];
  subjects: SubjectEnvelope[];
}

export interface SyncFilter<R extends SyncResource = SyncResource> {
  /** Subset of resources to sync. Default: all four, fetched in parallel. */
  resources?: R[];
}

// ---------------------------------------------------------------------------
// The namespace
// ---------------------------------------------------------------------------

/**
 * ⚡ NAMESPACE: `client.app.*` — visibly a second tier beside the faithful
 * resource namespaces (`client.assignments.*`). Alternatives considered:
 * `client.helpers.*` (vague), `client.composite.*` (jargon), top-level
 * `client.learnedSubjects()` (blurs the tiers — rejected by ADR-0003).
 */
export interface WanikaniApp {
  learnedSubjects(filter?: LearnedSubjectsFilter): Promise<LearnedSubject[]>;
  lessonQueue(filter?: LessonQueueFilter): Promise<LessonQueueItem[]>;
  reviewsDue(filter?: ReviewsDueFilter): Promise<ReviewDue[]>;
  subjectProgress(filter: SubjectProgressFilter): Promise<SubjectProgress[]>;
  levelStatus(filter?: LevelStatusFilter): Promise<LevelStatus>;
  /**
   * ⚡ Return type is `Pick<SyncResult, "since" | "fetchedAt" | R>` — only the
   * requested resource keys exist on the result, typed. (Sketch shows the
   * intent; the generic may be simplified if it fights inference in practice.)
   */
  syncSince<R extends SyncResource = SyncResource>(
    since: Timestamp,
    filter?: SyncFilter<R>,
  ): Promise<Pick<SyncResult, "since" | "fetchedAt" | R>>;
}

// ---------------------------------------------------------------------------
// Intended wiring (not implemented in this prototype):
//
//   const client = new WanikaniClient({ apiKey });
//   client.app.learnedSubjects({ types: ["kanji"], levels: [1, 2, 3] });
//
// Intended consumer flows this must feel right for:
//
//   // "all kanji I learned" for the LLM lesson generator
//   const learned = await client.app.learnedSubjects({ types: ["kanji"] });
//
//   // tonight's review session, with failure history for the LLM
//   const due = await client.app.reviewsDue({ limit: 20 });
//
//   // login sync watermark pattern
//   const delta = await client.app.syncSince(lastLoginAt);
//   save({ ...delta, lastLoginAt: delta.fetchedAt });
// ---------------------------------------------------------------------------
