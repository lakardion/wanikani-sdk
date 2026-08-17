/**
 * Public types for the composite-helper tier (`client.app.*`), the second tier
 * of the SDK surface approved in ADR-0003.
 *
 * Design rules (ADR-0003, ADR-0005):
 *  - Filters are camelCase here (snake_case on the resource tier); every field
 *    maps to a SERVER-SIDE query param wherever one exists. The one documented
 *    exception is `ReviewsDueFilter.limit`, which is client-side.
 *  - Helpers return JOINED AGGREGATES built from the `*Envelope` types — the
 *    envelope is where `id` and `data_updated_at` live.
 *  - Helpers paginate fully under the hood: every helper call means "all
 *    matching pages", never page 1.
 *  - No validator (etag / If-Modified-Since) params on helpers. Change
 *    detection uses `updated_after` watermarks (`syncSince`); a cheap
 *    unchanged-check is the documented "gate pattern" (see the module docs in
 *    `helpers.ts` and the README).
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
 * Scope over the user's assignments. Every field maps 1:1 to a server-side
 * assignment query param.
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
   * CLIENT-SIDE: no API equivalent. Truncates the joined result (e.g. "give
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

/**
 * Requires at least one field of T to be present.
 *
 * Written as a distributive conditional rather than the sketch's
 * `{ [K in keyof T]: ... }[keyof T]` — under TS 5.9 the mapped-indexed form
 * resolves to include `undefined` on property access (TS18048). This form has
 * identical public semantics: one required key, the rest optional.
 */
type AtLeastOne<T> = keyof T extends infer K extends keyof T
  ? K extends keyof T
    ? Required<Pick<T, K>> & Partial<Omit<T, K>>
    : never
  : never;

/**
 * No fetch-all: at least one filter field is REQUIRED. `subjectProgress({})`
 * and `subjectProgress()` are compile-time errors.
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
 * `client.app.*` — the composite tier, visibly separate from the faithful
 * resource namespaces (`client.assignments.*`). See ADR-0003.
 */
export interface WanikaniApp {
  learnedSubjects(filter?: LearnedSubjectsFilter): Promise<LearnedSubject[]>;
  lessonQueue(filter?: LessonQueueFilter): Promise<LessonQueueItem[]>;
  reviewsDue(filter?: ReviewsDueFilter): Promise<ReviewDue[]>;
  subjectProgress(filter: SubjectProgressFilter): Promise<SubjectProgress[]>;
  levelStatus(filter?: LevelStatusFilter): Promise<LevelStatus>;
  /**
   * Return type is `Pick<SyncResult, "since" | "fetchedAt" | R>` — only the
   * requested resource keys exist on the result, typed.
   */
  syncSince<R extends SyncResource = SyncResource>(
    since: Timestamp,
    filter?: SyncFilter<R>,
  ): Promise<Pick<SyncResult, "since" | "fetchedAt" | R>>;
}
