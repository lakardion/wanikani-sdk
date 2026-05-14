import * as v from "valibot";
import { NullableTimestamp, TimestampSchema, collection, envelope } from "./common";
import { SubjectTypeSchema } from "./subject";

export const AssignmentDataSchema = v.object({
  available_at: NullableTimestamp,
  burned_at: NullableTimestamp,
  created_at: TimestampSchema,
  hidden: v.boolean(),
  passed_at: NullableTimestamp,
  resurrected_at: NullableTimestamp,
  srs_stage: v.number(),
  started_at: NullableTimestamp,
  subject_id: v.number(),
  subject_type: SubjectTypeSchema,
  unlocked_at: NullableTimestamp,
});

export const AssignmentEnvelopeSchema = envelope("assignment", AssignmentDataSchema);
export const AssignmentCollectionSchema = collection("assignment", AssignmentDataSchema);

export type Assignment = v.InferOutput<typeof AssignmentDataSchema>;
export type AssignmentEnvelope = v.InferOutput<typeof AssignmentEnvelopeSchema>;
export type AssignmentCollection = v.InferOutput<typeof AssignmentCollectionSchema>;

export const ListAssignmentsInputSchema = v.partial(
  v.object({
    available_after: TimestampSchema,
    available_before: TimestampSchema,
    burned: v.boolean(),
    hidden: v.boolean(),
    ids: v.array(v.number()),
    immediately_available_for_lessons: v.boolean(),
    immediately_available_for_review: v.boolean(),
    in_review: v.boolean(),
    levels: v.array(v.number()),
    srs_stages: v.array(v.number()),
    started: v.boolean(),
    subject_ids: v.array(v.number()),
    subject_types: v.array(SubjectTypeSchema),
    unlocked: v.boolean(),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListAssignmentsInput = v.InferInput<typeof ListAssignmentsInputSchema>;
