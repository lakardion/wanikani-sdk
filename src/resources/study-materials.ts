import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  unwrapBody,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
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
  async function get(id: number): Promise<StudyMaterialEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<StudyMaterialEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `study_materials/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, StudyMaterialEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListStudyMaterialsInput): Promise<StudyMaterialCollection>;
  async function list(
    input: ListStudyMaterialsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<StudyMaterialCollection>>;
  async function list(input?: ListStudyMaterialsInput, validators?: CacheValidators) {
    const parsed = input
      ? validateInput(validate, ListStudyMaterialsInputSchema, input)
      : undefined;
    const res = await transport.request<unknown>({
      path: "study_materials",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, StudyMaterialCollectionSchema, raw),
    );
  }

  function paginateStudyMaterials(input?: ListStudyMaterialsInput) {
    const parsed = input
      ? validateInput(validate, ListStudyMaterialsInputSchema, input)
      : undefined;
    return paginate(
      transport,
      "study_materials",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, StudyMaterialCollectionSchema, raw),
    );
  }

  async function create(input: CreateStudyMaterialInput): Promise<StudyMaterialEnvelope> {
    const body = {
      study_material: validateInput(validate, CreateStudyMaterialInputSchema, input),
    };
    const res = await transport.request<unknown>({
      path: "study_materials",
      method: "POST",
      body,
    });
    return validateOutput(validate, StudyMaterialEnvelopeSchema, unwrapBody(res));
  }

  async function update(
    id: number,
    input: UpdateStudyMaterialInput,
  ): Promise<StudyMaterialEnvelope> {
    const body = {
      study_material: validateInput(validate, UpdateStudyMaterialInputSchema, input),
    };
    const res = await transport.request<unknown>({
      path: `study_materials/${id}`,
      method: "PUT",
      body,
    });
    return validateOutput(validate, StudyMaterialEnvelopeSchema, unwrapBody(res));
  }

  return { get, list, paginate: paginateStudyMaterials, create, update };
}
