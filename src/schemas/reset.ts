import * as v from "valibot";
import { TimestampSchema, collection, envelope } from "./common";

export const ResetDataSchema = v.object({
  confirmed_at: v.nullable(TimestampSchema),
  created_at: TimestampSchema,
  original_level: v.number(),
  target_level: v.number(),
});

export const ResetEnvelopeSchema = envelope("reset", ResetDataSchema);
export const ResetCollectionSchema = collection("reset", ResetDataSchema);

export type Reset = v.InferOutput<typeof ResetDataSchema>;
export type ResetEnvelope = v.InferOutput<typeof ResetEnvelopeSchema>;
export type ResetCollection = v.InferOutput<typeof ResetCollectionSchema>;

export const ListResetsInputSchema = v.partial(
  v.object({
    ids: v.array(v.number()),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListResetsInput = v.InferInput<typeof ListResetsInputSchema>;
