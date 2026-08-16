import * as v from "valibot";
import { NullableTimestamp, TimestampSchema } from "./common";

export const SummaryDataSchema = v.looseObject({
  lessons: v.array(
    v.looseObject({
      available_at: TimestampSchema,
      subject_ids: v.array(v.number()),
    }),
  ),
  next_reviews_at: NullableTimestamp,
  reviews: v.array(
    v.looseObject({
      available_at: TimestampSchema,
      subject_ids: v.array(v.number()),
    }),
  ),
});

export const SummaryEnvelopeSchema = v.looseObject({
  object: v.literal("report"),
  url: v.string(),
  data_updated_at: NullableTimestamp,
  data: SummaryDataSchema,
});

export type Summary = v.InferOutput<typeof SummaryDataSchema>;
export type SummaryEnvelope = v.InferOutput<typeof SummaryEnvelopeSchema>;
