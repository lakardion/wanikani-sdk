import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  ListResetsInputSchema,
  ResetCollectionSchema,
  ResetEnvelopeSchema,
  type ListResetsInput,
  type ResetCollection,
  type ResetEnvelope,
} from "../schemas/reset";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createResetsResource(transport: Transport, validate: ValidateContext) {
  async function get(id: number): Promise<ResetEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<ResetEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `resets/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, ResetEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListResetsInput): Promise<ResetCollection>;
  async function list(
    input: ListResetsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<ResetCollection>>;
  async function list(input?: ListResetsInput, validators?: CacheValidators) {
    const parsed = input ? validateInput(validate, ListResetsInputSchema, input) : undefined;
    const res = await transport.request<unknown>({
      path: "resets",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, ResetCollectionSchema, raw),
    );
  }

  function paginateResets(input?: ListResetsInput) {
    const parsed = input ? validateInput(validate, ListResetsInputSchema, input) : undefined;
    return paginate(transport, "resets", parsed as Record<string, unknown> | undefined, (raw) =>
      validateOutput(validate, ResetCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateResets };
}
