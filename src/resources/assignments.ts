import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  AssignmentCollectionSchema,
  AssignmentEnvelopeSchema,
  ListAssignmentsInputSchema,
  type AssignmentCollection,
  type AssignmentEnvelope,
  type ListAssignmentsInput,
} from "../schemas/assignment";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createAssignmentsResource(transport: Transport, validate: ValidateContext) {
  async function get(id: number): Promise<AssignmentEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<AssignmentEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `assignments/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, AssignmentEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListAssignmentsInput): Promise<AssignmentCollection>;
  async function list(
    input: ListAssignmentsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<AssignmentCollection>>;
  async function list(input?: ListAssignmentsInput, validators?: CacheValidators) {
    const parsed = input ? validateInput(validate, ListAssignmentsInputSchema, input) : undefined;
    const res = await transport.request<unknown>({
      path: "assignments",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, AssignmentCollectionSchema, raw),
    );
  }

  function paginateAssignments(input?: ListAssignmentsInput) {
    const parsed = input ? validateInput(validate, ListAssignmentsInputSchema, input) : undefined;
    return paginate(
      transport,
      "assignments",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, AssignmentCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateAssignments };
}
