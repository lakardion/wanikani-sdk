import * as v from "valibot";
import { TimestampSchema, collection, envelope } from "./common";
import { SubjectTypeSchema } from "./subject";

export const ReviewStatisticDataSchema = v.looseObject({
  created_at: TimestampSchema,
  hidden: v.boolean(),
  meaning_correct: v.number(),
  meaning_current_streak: v.number(),
  meaning_incorrect: v.number(),
  meaning_max_streak: v.number(),
  percentage_correct: v.number(),
  reading_correct: v.number(),
  reading_current_streak: v.number(),
  reading_incorrect: v.number(),
  reading_max_streak: v.number(),
  subject_id: v.number(),
  subject_type: SubjectTypeSchema,
});

export const ReviewStatisticEnvelopeSchema = envelope(
  "review_statistic",
  ReviewStatisticDataSchema,
);
export const ReviewStatisticCollectionSchema = collection(
  "review_statistic",
  ReviewStatisticDataSchema,
);

export type ReviewStatistic = v.InferOutput<typeof ReviewStatisticDataSchema>;
export type ReviewStatisticEnvelope = v.InferOutput<typeof ReviewStatisticEnvelopeSchema>;
export type ReviewStatisticCollection = v.InferOutput<typeof ReviewStatisticCollectionSchema>;

export const ListReviewStatisticsInputSchema = v.partial(
  v.object({
    hidden: v.boolean(),
    ids: v.array(v.number()),
    percentages_greater_than: v.number(),
    percentages_less_than: v.number(),
    subject_ids: v.array(v.number()),
    subject_types: v.array(SubjectTypeSchema),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListReviewStatisticsInput = v.InferInput<typeof ListReviewStatisticsInputSchema>;
