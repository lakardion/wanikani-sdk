import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  ListSpacedRepetitionSystemsInputSchema,
  SpacedRepetitionSystemCollectionSchema,
  SpacedRepetitionSystemEnvelopeSchema,
  type ListSpacedRepetitionSystemsInput,
  type SpacedRepetitionSystemCollection,
  type SpacedRepetitionSystemEnvelope,
} from "../schemas/srs";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createSpacedRepetitionSystemsResource(
  transport: Transport,
  validate: ValidateContext,
) {
  async function get(id: number): Promise<SpacedRepetitionSystemEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<SpacedRepetitionSystemEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `spaced_repetition_systems/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, SpacedRepetitionSystemEnvelopeSchema, raw),
    );
  }

  async function list(
    input?: ListSpacedRepetitionSystemsInput,
  ): Promise<SpacedRepetitionSystemCollection>;
  async function list(
    input: ListSpacedRepetitionSystemsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<SpacedRepetitionSystemCollection>>;
  async function list(input?: ListSpacedRepetitionSystemsInput, validators?: CacheValidators) {
    const parsed = input
      ? validateInput(validate, ListSpacedRepetitionSystemsInputSchema, input)
      : undefined;
    const res = await transport.request<unknown>({
      path: "spaced_repetition_systems",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, SpacedRepetitionSystemCollectionSchema, raw),
    );
  }

  function paginateSpacedRepetitionSystems(input?: ListSpacedRepetitionSystemsInput) {
    const parsed = input
      ? validateInput(validate, ListSpacedRepetitionSystemsInputSchema, input)
      : undefined;
    return paginate(
      transport,
      "spaced_repetition_systems",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, SpacedRepetitionSystemCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateSpacedRepetitionSystems };
}
