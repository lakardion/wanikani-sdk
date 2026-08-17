import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  ListSubjectsInputSchema,
  SubjectCollectionSchema,
  SubjectEnvelopeSchema,
  type ListSubjectsInput,
  type SubjectCollection,
  type SubjectEnvelope,
} from "../schemas/subject";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createSubjectsResource(transport: Transport, validate: ValidateContext) {
  async function get(id: number): Promise<SubjectEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<SubjectEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `subjects/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, SubjectEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListSubjectsInput): Promise<SubjectCollection>;
  async function list(
    input: ListSubjectsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<SubjectCollection>>;
  async function list(input?: ListSubjectsInput, validators?: CacheValidators) {
    const parsed = input ? validateInput(validate, ListSubjectsInputSchema, input) : undefined;
    const res = await transport.request<unknown>({
      path: "subjects",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, SubjectCollectionSchema, raw),
    );
  }

  function paginateSubjects(input?: ListSubjectsInput) {
    const parsed = input ? validateInput(validate, ListSubjectsInputSchema, input) : undefined;
    return paginate(transport, "subjects", parsed as Record<string, unknown> | undefined, (raw) =>
      validateOutput(validate, SubjectCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateSubjects };
}
