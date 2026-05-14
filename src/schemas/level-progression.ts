import * as v from "valibot";
import { NullableTimestamp, TimestampSchema, collection, envelope } from "./common";

export const LevelProgressionDataSchema = v.object({
  abandoned_at: NullableTimestamp,
  completed_at: NullableTimestamp,
  created_at: TimestampSchema,
  level: v.number(),
  passed_at: NullableTimestamp,
  started_at: NullableTimestamp,
  unlocked_at: NullableTimestamp,
});

export const LevelProgressionEnvelopeSchema = envelope(
  "level_progression",
  LevelProgressionDataSchema,
);
export const LevelProgressionCollectionSchema = collection(
  "level_progression",
  LevelProgressionDataSchema,
);

export type LevelProgression = v.InferOutput<typeof LevelProgressionDataSchema>;
export type LevelProgressionEnvelope = v.InferOutput<typeof LevelProgressionEnvelopeSchema>;
export type LevelProgressionCollection = v.InferOutput<typeof LevelProgressionCollectionSchema>;

export const ListLevelProgressionsInputSchema = v.partial(
  v.object({
    ids: v.array(v.number()),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListLevelProgressionsInput = v.InferInput<typeof ListLevelProgressionsInputSchema>;
