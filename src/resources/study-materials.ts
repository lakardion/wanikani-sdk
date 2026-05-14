import type { Transport } from "../http/transport";
import { paginate } from "../http/paginate";
import {
  CreateStudyMaterialInputSchema,
  ListStudyMaterialsInputSchema,
  StudyMaterialCollectionSchema,
  StudyMaterialEnvelopeSchema,
  UpdateStudyMaterialInputSchema,
  type CreateStudyMaterialInput,
  type ListStudyMaterialsInput,
  type StudyMaterialCollection,
  type StudyMaterialEnvelope,
  type UpdateStudyMaterialInput,
} from "../schemas/study-material";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createStudyMaterialsResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(id: number): Promise<StudyMaterialEnvelope> {
      const raw = await transport.request<unknown>({ path: `study_materials/${id}` });
      return validateOutput(validate, StudyMaterialEnvelopeSchema, raw);
    },
    async list(input?: ListStudyMaterialsInput): Promise<StudyMaterialCollection> {
      const parsed = input
        ? validateInput(validate, ListStudyMaterialsInputSchema, input)
        : undefined;
      const raw = await transport.request<unknown>({
        path: "study_materials",
        query: parsed as never,
      });
      return validateOutput(validate, StudyMaterialCollectionSchema, raw);
    },
    paginate(input?: ListStudyMaterialsInput) {
      const parsed = input
        ? validateInput(validate, ListStudyMaterialsInputSchema, input)
        : undefined;
      return paginate(
        transport,
        "study_materials",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, StudyMaterialCollectionSchema, raw),
      );
    },
    async create(input: CreateStudyMaterialInput): Promise<StudyMaterialEnvelope> {
      const body = {
        study_material: validateInput(validate, CreateStudyMaterialInputSchema, input),
      };
      const raw = await transport.request<unknown>({
        path: "study_materials",
        method: "POST",
        body,
      });
      return validateOutput(validate, StudyMaterialEnvelopeSchema, raw);
    },
    async update(id: number, input: UpdateStudyMaterialInput): Promise<StudyMaterialEnvelope> {
      const body = {
        study_material: validateInput(validate, UpdateStudyMaterialInputSchema, input),
      };
      const raw = await transport.request<unknown>({
        path: `study_materials/${id}`,
        method: "PUT",
        body,
      });
      return validateOutput(validate, StudyMaterialEnvelopeSchema, raw);
    },
  };
}
