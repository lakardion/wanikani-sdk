import * as v from "valibot";
import { NullableTimestamp, TimestampSchema } from "./common";

export const SubscriptionSchema = v.object({
  active: v.boolean(),
  max_level_granted: v.number(),
  period_ends_at: v.nullable(TimestampSchema),
  type: v.picklist(["free", "recurring", "lifetime", "unknown"]),
});

export const UserPreferencesSchema = v.object({
  default_voice_actor_id: v.number(),
  extra_study_autoplay_audio: v.boolean(),
  lessons_autoplay_audio: v.boolean(),
  lessons_batch_size: v.number(),
  lessons_presentation_order: v.picklist([
    "ascending_level_then_subject",
    "shuffled",
    "ascending_level_then_shuffled",
  ]),
  reviews_autoplay_audio: v.boolean(),
  reviews_display_srs_indicator: v.boolean(),
  reviews_presentation_order: v.optional(v.picklist(["shuffled", "lower_levels_first"])),
});

export const UserDataSchema = v.object({
  id: v.string(),
  username: v.string(),
  level: v.number(),
  profile_url: v.string(),
  started_at: TimestampSchema,
  current_vacation_started_at: v.nullable(TimestampSchema),
  subscription: SubscriptionSchema,
  preferences: UserPreferencesSchema,
});

export const UserEnvelopeSchema = v.object({
  object: v.literal("user"),
  url: v.string(),
  data_updated_at: NullableTimestamp,
  data: UserDataSchema,
});

export type User = v.InferOutput<typeof UserDataSchema>;
export type UserEnvelope = v.InferOutput<typeof UserEnvelopeSchema>;

export const UpdateUserInputSchema = v.object({
  preferences: v.partial(UserPreferencesSchema),
});
export type UpdateUserInput = v.InferInput<typeof UpdateUserInputSchema>;
