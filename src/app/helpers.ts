/**
 * Composite-helper tier (`client.app.*`) — the app-level joins approved in
 * ADR-0003, implemented on top of the same transport as the resource tier.
 *
 * Behavior contract:
 *  - FULL pagination under the hood: every helper call collects all matching
 *    pages via `src/http/paginate.ts`, never just page 1.
 *  - camelCase filter fields map to server-side query params wherever one
 *    exists (`types` → `subject_types`, `srsStages` → `srs_stages`,
 *    `updatedAfter` → `updated_after`, `availableBefore` → `available_before`,
 *    `levels`/`burned`/`ids`/`slugs` direct). The one documented exception is
 *    `ReviewsDueFilter.limit`, applied client-side after the join.
 *  - Joins against `subjects?ids=…` / `*?subject_ids=…` are chunked
 *    ({@link ID_CHUNK_SIZE} ids per request) to stay under URL length limits.
 *  - Inputs are run through the resource tier's list schemas, so the client's
 *    `validate` policy applies to helper calls exactly as it does to
 *    resource calls.
 *  - If an assignment references a subject the API no longer returns (e.g. a
 *    hidden subject), the item is dropped from the joined result rather than
 *    failing the whole call.
 *
 * No validator params (ADR-0005). To cheaply skip a helper call when nothing
 * changed, compose the GATE PATTERN: one cheap resource-tier `list()` probe in
 * front of the helper — a 304 (`WanikaniNotModified`) skips the join entirely,
 * and a fresh response's etag becomes the next stored validator. Per-resource
 * validator params land with the conditional-request wiring on the roadmap (the
 * transport already sends `If-None-Match` end-to-end); until then the probe
 * uses an `updated_after` watermark, which serves the same gate role:
 *
 * ```ts
 * // One cheap watermark probe on the resource tier…
 * const probe = await client.assignments.list({ started: true, updated_after: lastSync });
 * if (probe.data.length === 0) return cached; // …skips the join.
 * const learned = await client.app.learnedSubjects();
 * ```
 *
 * For change detection proper, use the watermark flow: `syncSince(since)` →
 * store the returned `fetchedAt` as the next `since`.
 */

import { collectAll } from "../http/paginate";
import type { Transport } from "../http/transport";
import {
  AssignmentCollectionSchema,
  ListAssignmentsInputSchema,
  type AssignmentCollection,
  type AssignmentEnvelope,
  type ListAssignmentsInput,
} from "../schemas/assignment";
import type { Timestamp } from "../schemas/common";
import {
  LevelProgressionCollectionSchema,
  type LevelProgressionCollection,
  type LevelProgressionEnvelope,
} from "../schemas/level-progression";
import {
  ListReviewStatisticsInputSchema,
  ReviewStatisticCollectionSchema,
  type ListReviewStatisticsInput,
  type ReviewStatisticCollection,
  type ReviewStatisticEnvelope,
} from "../schemas/review-statistic";
import {
  ListStudyMaterialsInputSchema,
  StudyMaterialCollectionSchema,
  type ListStudyMaterialsInput,
  type StudyMaterialCollection,
  type StudyMaterialEnvelope,
} from "../schemas/study-material";
import {
  ListSubjectsInputSchema,
  SubjectCollectionSchema,
  type ListSubjectsInput,
  type SubjectCollection,
  type SubjectEnvelope,
} from "../schemas/subject";
import { UserEnvelopeSchema } from "../schemas/user";
import { type ValidateContext, validateInput, validateOutput } from "../resources/validate";
import type {
  KanjiGateItem,
  LearnedSubject,
  LearnedSubjectsFilter,
  LessonQueueFilter,
  LessonQueueItem,
  LevelStatus,
  LevelStatusFilter,
  ReviewDue,
  ReviewsDueFilter,
  SubjectProgress,
  SubjectProgressFilter,
  SyncFilter,
  SyncResource,
  SyncResult,
  WanikaniApp,
} from "./types";

/**
 * Conservative chunk size for batched `ids` / `subject_ids` query params, to
 * keep request URLs well under length limits.
 */
const ID_CHUNK_SIZE = 200;

const ALL_SYNC_RESOURCES: readonly SyncResource[] = [
  "assignments",
  "reviewStatistics",
  "studyMaterials",
  "subjects",
];

export function createWanikaniApp(transport: Transport, validate: ValidateContext): WanikaniApp {
  function parseAssignmentPage(raw: unknown): AssignmentCollection {
    return validateOutput(validate, AssignmentCollectionSchema, raw);
  }

  function collectAssignments(query: ListAssignmentsInput): Promise<AssignmentEnvelope[]> {
    const parsed = validateInput(validate, ListAssignmentsInputSchema, query);
    return collectAll(
      transport,
      "assignments",
      parsed as Record<string, unknown>,
      parseAssignmentPage,
    );
  }

  function parseSubjectPage(raw: unknown): SubjectCollection {
    return validateOutput(validate, SubjectCollectionSchema, raw);
  }

  function collectSubjects(query: ListSubjectsInput): Promise<SubjectEnvelope[]> {
    const parsed = validateInput(validate, ListSubjectsInputSchema, query);
    return collectAll(transport, "subjects", parsed as Record<string, unknown>, parseSubjectPage);
  }

  function parseReviewStatisticPage(raw: unknown): ReviewStatisticCollection {
    return validateOutput(validate, ReviewStatisticCollectionSchema, raw);
  }

  function collectReviewStatistics(
    query: ListReviewStatisticsInput,
  ): Promise<ReviewStatisticEnvelope[]> {
    const parsed = validateInput(validate, ListReviewStatisticsInputSchema, query);
    return collectAll(
      transport,
      "review_statistics",
      parsed as Record<string, unknown>,
      parseReviewStatisticPage,
    );
  }

  function parseStudyMaterialPage(raw: unknown): StudyMaterialCollection {
    return validateOutput(validate, StudyMaterialCollectionSchema, raw);
  }

  function collectStudyMaterials(query: ListStudyMaterialsInput): Promise<StudyMaterialEnvelope[]> {
    const parsed = validateInput(validate, ListStudyMaterialsInputSchema, query);
    return collectAll(
      transport,
      "study_materials",
      parsed as Record<string, unknown>,
      parseStudyMaterialPage,
    );
  }

  /** Batched `subjects?ids=…`, chunked. Empty input short-circuits (no request). */
  async function fetchSubjectsByIds(ids: number[]): Promise<SubjectEnvelope[]> {
    const unique = [...new Set(ids)];
    const pages = await Promise.all(
      chunk(unique, ID_CHUNK_SIZE).map((idsChunk) => collectSubjects({ ids: idsChunk })),
    );
    return pages.flat();
  }

  /** Batched `assignments?subject_ids=…`, chunked. */
  async function fetchAssignmentsBySubjectIds(ids: number[]): Promise<AssignmentEnvelope[]> {
    const unique = [...new Set(ids)];
    const pages = await Promise.all(
      chunk(unique, ID_CHUNK_SIZE).map((idsChunk) => collectAssignments({ subject_ids: idsChunk })),
    );
    return pages.flat();
  }

  /** Batched `review_statistics?subject_ids=…`, chunked. */
  async function fetchReviewStatisticsBySubjectIds(
    ids: number[],
  ): Promise<ReviewStatisticEnvelope[]> {
    const unique = [...new Set(ids)];
    const pages = await Promise.all(
      chunk(unique, ID_CHUNK_SIZE).map((idsChunk) =>
        collectReviewStatistics({ subject_ids: idsChunk }),
      ),
    );
    return pages.flat();
  }

  /** Batched `study_materials?subject_ids=…`, chunked. */
  async function fetchStudyMaterialsBySubjectIds(ids: number[]): Promise<StudyMaterialEnvelope[]> {
    const unique = [...new Set(ids)];
    const pages = await Promise.all(
      chunk(unique, ID_CHUNK_SIZE).map((idsChunk) =>
        collectStudyMaterials({ subject_ids: idsChunk }),
      ),
    );
    return pages.flat();
  }

  return {
    async learnedSubjects(filter: LearnedSubjectsFilter = {}): Promise<LearnedSubject[]> {
      const assignments = await collectAssignments({
        started: true,
        subject_types: filter.types,
        levels: filter.levels,
        srs_stages: filter.srsStages,
        burned: filter.burned,
        updated_after: filter.updatedAfter,
      });
      const subjectsById = indexById(
        await fetchSubjectsByIds(assignments.map((a) => a.data.subject_id)),
      );
      const out: LearnedSubject[] = [];
      for (const assignment of assignments) {
        const subject = subjectsById.get(assignment.data.subject_id);
        if (subject) out.push({ subject, assignment });
      }
      return out;
    },

    async lessonQueue(filter: LessonQueueFilter = {}): Promise<LessonQueueItem[]> {
      const assignments = await collectAssignments({
        immediately_available_for_lessons: true,
        subject_types: filter.types,
        levels: filter.levels,
      });
      const subjectsById = indexById(
        await fetchSubjectsByIds(assignments.map((a) => a.data.subject_id)),
      );
      const out: LessonQueueItem[] = [];
      for (const assignment of assignments) {
        const subject = subjectsById.get(assignment.data.subject_id);
        if (subject) out.push({ subject, assignment });
      }
      return out;
    },

    async reviewsDue(filter: ReviewsDueFilter = {}): Promise<ReviewDue[]> {
      const assignments = await collectAssignments(
        filter.availableBefore
          ? {
              available_before: filter.availableBefore,
              subject_types: filter.types,
              levels: filter.levels,
            }
          : {
              immediately_available_for_review: true,
              subject_types: filter.types,
              levels: filter.levels,
            },
      );
      const subjectIds = assignments.map((a) => a.data.subject_id);
      const [subjects, statistics] = await Promise.all([
        fetchSubjectsByIds(subjectIds),
        fetchReviewStatisticsBySubjectIds(subjectIds),
      ]);
      const subjectsById = indexById(subjects);
      const statisticsBySubjectId = indexBySubjectId(statistics);
      const out: ReviewDue[] = [];
      for (const assignment of assignments) {
        const subject = subjectsById.get(assignment.data.subject_id);
        if (!subject) continue;
        out.push({
          subject,
          assignment,
          reviewStatistic: statisticsBySubjectId.get(assignment.data.subject_id) ?? null,
        });
        if (filter.limit !== undefined && out.length >= filter.limit) break;
      }
      return out;
    },

    async subjectProgress(filter: SubjectProgressFilter): Promise<SubjectProgress[]> {
      const subjects = await collectSubjects({
        ids: filter.ids,
        slugs: filter.slugs,
        types: filter.types,
        levels: filter.levels,
      });
      const ids = subjects.map((s) => s.id);
      const [assignments, statistics, materials] = await Promise.all([
        fetchAssignmentsBySubjectIds(ids),
        fetchReviewStatisticsBySubjectIds(ids),
        fetchStudyMaterialsBySubjectIds(ids),
      ]);
      const assignmentsBySubjectId = indexBySubjectId(assignments);
      const statisticsBySubjectId = indexBySubjectId(statistics);
      const materialsBySubjectId = indexBySubjectId(materials);
      return subjects.map((subject) => ({
        subject,
        assignment: assignmentsBySubjectId.get(subject.id) ?? null,
        reviewStatistic: statisticsBySubjectId.get(subject.id) ?? null,
        studyMaterial: materialsBySubjectId.get(subject.id) ?? null,
      }));
    },

    async levelStatus(filter: LevelStatusFilter = {}): Promise<LevelStatus> {
      let level = filter.level;
      if (level === undefined) {
        const raw = await transport.request<unknown>({ path: "user" });
        level = validateOutput(validate, UserEnvelopeSchema, raw).data.level;
      }
      const [progressions, kanji] = await Promise.all([
        collectAll<LevelProgressionEnvelope, LevelProgressionCollection>(
          transport,
          "level_progressions",
          undefined,
          (raw): LevelProgressionCollection =>
            validateOutput(validate, LevelProgressionCollectionSchema, raw),
        ),
        collectSubjects({ types: ["kanji"], levels: [level] }),
      ]);
      const progression = progressions.find((p) => p.data.level === level) ?? null;
      const assignmentsBySubjectId = indexBySubjectId(
        await fetchAssignmentsBySubjectIds(kanji.map((s) => s.id)),
      );
      const kanjiGate: KanjiGateItem[] = kanji.map((subject) => ({
        subject,
        assignment: assignmentsBySubjectId.get(subject.id) ?? null,
      }));
      return { level, progression, kanjiGate };
    },

    async syncSince<R extends SyncResource = SyncResource>(
      since: Timestamp,
      filter?: SyncFilter<R>,
    ): Promise<Pick<SyncResult, "since" | "fetchedAt" | R>> {
      const wanted = new Set<SyncResource>(filter?.resources ?? ALL_SYNC_RESOURCES);
      const [assignments, reviewStatistics, studyMaterials, subjects] = await Promise.all([
        wanted.has("assignments") ? collectAssignments({ updated_after: since }) : undefined,
        wanted.has("reviewStatistics")
          ? collectReviewStatistics({ updated_after: since })
          : undefined,
        wanted.has("studyMaterials") ? collectStudyMaterials({ updated_after: since }) : undefined,
        wanted.has("subjects") ? collectSubjects({ updated_after: since }) : undefined,
      ]);
      const result: Record<string, unknown> = {
        since,
        fetchedAt: new Date().toISOString(),
      };
      if (assignments) result.assignments = assignments;
      if (reviewStatistics) result.reviewStatistics = reviewStatistics;
      if (studyMaterials) result.studyMaterials = studyMaterials;
      if (subjects) result.subjects = subjects;
      return result as Pick<SyncResult, "since" | "fetchedAt" | R>;
    },
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function indexById<T extends { id: number }>(envelopes: T[]): Map<number, T> {
  const map = new Map<number, T>();
  for (const envelope of envelopes) map.set(envelope.id, envelope);
  return map;
}

function indexBySubjectId<T extends { data: { subject_id: number } }>(
  envelopes: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const envelope of envelopes) map.set(envelope.data.subject_id, envelope);
  return map;
}
