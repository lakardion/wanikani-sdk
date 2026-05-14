import * as v from "valibot";
import { TimestampSchema, collection, envelope } from "./common";

export const VoiceActorDataSchema = v.object({
  created_at: TimestampSchema,
  description: v.string(),
  gender: v.picklist(["male", "female"]),
  name: v.string(),
});

export const VoiceActorEnvelopeSchema = envelope("voice_actor", VoiceActorDataSchema);
export const VoiceActorCollectionSchema = collection("voice_actor", VoiceActorDataSchema);

export type VoiceActor = v.InferOutput<typeof VoiceActorDataSchema>;
export type VoiceActorEnvelope = v.InferOutput<typeof VoiceActorEnvelopeSchema>;
export type VoiceActorCollection = v.InferOutput<typeof VoiceActorCollectionSchema>;

export const ListVoiceActorsInputSchema = v.partial(
  v.object({
    ids: v.array(v.number()),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListVoiceActorsInput = v.InferInput<typeof ListVoiceActorsInputSchema>;
