import * as v from "valibot";
import { TimestampSchema, collection, envelope } from "./common";
import { SubjectTypeSchema } from "./subject";

export const StudyMaterialDataSchema = v.looseObject({
  created_at: TimestampSchema,
  hidden: v.boolean(),
  meaning_note: v.nullable(v.string()),
  meaning_synonyms: v.array(v.string()),
  reading_note: v.nullable(v.string()),
  subject_id: v.number(),
  subject_type: SubjectTypeSchema,
});

export const StudyMaterialEnvelopeSchema = envelope("study_material", StudyMaterialDataSchema);
export const StudyMaterialCollectionSchema = collection("study_material", StudyMaterialDataSchema);

export type StudyMaterial = v.InferOutput<typeof StudyMaterialDataSchema>;
export type StudyMaterialEnvelope = v.InferOutput<typeof StudyMaterialEnvelopeSchema>;
export type StudyMaterialCollection = v.InferOutput<typeof StudyMaterialCollectionSchema>;

export const ListStudyMaterialsInputSchema = v.partial(
  v.object({
    hidden: v.boolean(),
    ids: v.array(v.number()),
    subject_ids: v.array(v.number()),
    subject_types: v.array(SubjectTypeSchema),
    updated_after: TimestampSchema,
    page_after_id: v.number(),
    page_before_id: v.number(),
  }),
);
export type ListStudyMaterialsInput = v.InferInput<typeof ListStudyMaterialsInputSchema>;

export const CreateStudyMaterialInputSchema = v.object({
  subject_id: v.number(),
  meaning_note: v.optional(v.nullable(v.string())),
  reading_note: v.optional(v.nullable(v.string())),
  meaning_synonyms: v.optional(v.array(v.string())),
});
export type CreateStudyMaterialInput = v.InferInput<typeof CreateStudyMaterialInputSchema>;

export const UpdateStudyMaterialInputSchema = v.partial(
  v.object({
    meaning_note: v.nullable(v.string()),
    reading_note: v.nullable(v.string()),
    meaning_synonyms: v.array(v.string()),
  }),
);
export type UpdateStudyMaterialInput = v.InferInput<typeof UpdateStudyMaterialInputSchema>;
