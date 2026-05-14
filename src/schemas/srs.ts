import * as v from "valibot";
import { TimestampSchema, collection, envelope } from "./common";

const StageSchema = v.object({
  interval: v.nullable(v.number()),
  interval_unit: v.nullable(
    v.picklist(["milliseconds", "seconds", "minutes", "hours", "days", "weeks"]),
  ),
  position: v.number(),
});

export const SpacedRepetitionSystemDataSchema = v.object({
  burning_stage_position: v.number(),
  created_at: TimestampSchema,
  description: v.string(),
  name: v.string(),
  passing_stage_position: v.number(),
  stages: v.array(StageSchema),
  starting_stage_position: v.number(),
  unlocking_stage_position: v.number(),
});

export const SpacedRepetitionSystemEnvelopeSchema = envelope(
  "spaced_repetition_system",
  SpacedRepetitionSystemDataSchema,
);
export const SpacedRepetitionSystemCollectionSchema = collection(
  "spaced_repetition_system",
  SpacedRepetitionSystemDataSchema,
);

export type SpacedRepetitionSystem = v.InferOutput<typeof SpacedRepetitionSystemDataSchema>;
export type SpacedRepetitionSystemEnvelope = v.InferOutput<
  typeof SpacedRepetitionSystemEnvelopeSchema
>;
export type SpacedRepetitionSystemCollection = v.InferOutput<
  typeof SpacedRepetitionSystemCollectionSchema
>;

export const ListSpacedRepetitionSystemsInputSchema = v.partial(
  v.object({
    ids: v.array(v.number()),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListSpacedRepetitionSystemsInput = v.InferInput<
  typeof ListSpacedRepetitionSystemsInputSchema
>;
