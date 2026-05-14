import * as v from "valibot";
import { NullableTimestamp, TimestampSchema } from "./common";

export const SubjectTypeSchema = v.picklist(["radical", "kanji", "vocabulary", "kana_vocabulary"]);
export type SubjectType = v.InferOutput<typeof SubjectTypeSchema>;

const MeaningSchema = v.object({
  meaning: v.string(),
  primary: v.boolean(),
  accepted_answer: v.boolean(),
});

const AuxiliaryMeaningSchema = v.object({
  meaning: v.string(),
  type: v.picklist(["whitelist", "blacklist"]),
});

const ReadingSchema = v.object({
  reading: v.string(),
  primary: v.boolean(),
  accepted_answer: v.boolean(),
  type: v.optional(v.picklist(["kunyomi", "nanori", "onyomi"])),
});

const CharacterImageSchema = v.object({
  url: v.string(),
  content_type: v.string(),
  metadata: v.record(v.string(), v.unknown()),
});

const PronunciationAudioSchema = v.object({
  url: v.string(),
  content_type: v.string(),
  metadata: v.record(v.string(), v.unknown()),
});

const SubjectCommonSchema = v.object({
  auxiliary_meanings: v.array(AuxiliaryMeaningSchema),
  created_at: TimestampSchema,
  document_url: v.string(),
  hidden_at: NullableTimestamp,
  lesson_position: v.number(),
  level: v.number(),
  meaning_mnemonic: v.string(),
  meanings: v.array(MeaningSchema),
  slug: v.string(),
  spaced_repetition_system_id: v.number(),
});

export const RadicalDataSchema = v.object({
  ...SubjectCommonSchema.entries,
  amalgamation_subject_ids: v.array(v.number()),
  characters: v.nullable(v.string()),
  character_images: v.array(CharacterImageSchema),
});

export const KanjiDataSchema = v.object({
  ...SubjectCommonSchema.entries,
  amalgamation_subject_ids: v.array(v.number()),
  characters: v.string(),
  component_subject_ids: v.array(v.number()),
  meaning_hint: v.nullable(v.string()),
  reading_hint: v.nullable(v.string()),
  reading_mnemonic: v.string(),
  readings: v.array(ReadingSchema),
  visually_similar_subject_ids: v.array(v.number()),
});

export const VocabularyDataSchema = v.object({
  ...SubjectCommonSchema.entries,
  characters: v.string(),
  component_subject_ids: v.array(v.number()),
  context_sentences: v.array(v.object({ en: v.string(), ja: v.string() })),
  parts_of_speech: v.array(v.string()),
  pronunciation_audios: v.array(PronunciationAudioSchema),
  reading_mnemonic: v.string(),
  readings: v.array(ReadingSchema),
});

export const KanaVocabularyDataSchema = v.object({
  ...SubjectCommonSchema.entries,
  characters: v.string(),
  context_sentences: v.array(v.object({ en: v.string(), ja: v.string() })),
  parts_of_speech: v.array(v.string()),
  pronunciation_audios: v.array(PronunciationAudioSchema),
});

export const SubjectDataSchema = v.union([
  RadicalDataSchema,
  KanjiDataSchema,
  VocabularyDataSchema,
  KanaVocabularyDataSchema,
]);

export const SubjectEnvelopeSchema = v.object({
  id: v.number(),
  object: SubjectTypeSchema,
  url: v.string(),
  data_updated_at: NullableTimestamp,
  data: SubjectDataSchema,
});

export const SubjectCollectionSchema = v.object({
  object: v.literal("collection"),
  url: v.string(),
  pages: v.object({
    next_url: v.nullable(v.string()),
    previous_url: v.nullable(v.string()),
    per_page: v.number(),
  }),
  total_count: v.number(),
  data_updated_at: NullableTimestamp,
  data: v.array(SubjectEnvelopeSchema),
});

export type Subject = v.InferOutput<typeof SubjectDataSchema>;
export type SubjectEnvelope = v.InferOutput<typeof SubjectEnvelopeSchema>;
export type SubjectCollection = v.InferOutput<typeof SubjectCollectionSchema>;

export const ListSubjectsInputSchema = v.partial(
  v.object({
    ids: v.array(v.number()),
    types: v.array(SubjectTypeSchema),
    slugs: v.array(v.string()),
    levels: v.array(v.number()),
    hidden: v.boolean(),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListSubjectsInput = v.InferInput<typeof ListSubjectsInputSchema>;
