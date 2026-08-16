import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  LevelProgressionCollectionSchema,
  LevelProgressionEnvelopeSchema,
  ListLevelProgressionsInputSchema,
  type LevelProgressionCollection,
  type LevelProgressionEnvelope,
  type ListLevelProgressionsInput,
} from "../schemas/level-progression";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createLevelProgressionsResource(transport: Transport, validate: ValidateContext) {
  async function get(id: number): Promise<LevelProgressionEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<LevelProgressionEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `level_progressions/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, LevelProgressionEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListLevelProgressionsInput): Promise<LevelProgressionCollection>;
  async function list(
    input: ListLevelProgressionsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<LevelProgressionCollection>>;
  async function list(input?: ListLevelProgressionsInput, validators?: CacheValidators) {
    const parsed = input
      ? validateInput(validate, ListLevelProgressionsInputSchema, input)
      : undefined;
    const res = await transport.request<unknown>({
      path: "level_progressions",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, LevelProgressionCollectionSchema, raw),
    );
  }

  function paginateLevelProgressions(input?: ListLevelProgressionsInput) {
    const parsed = input
      ? validateInput(validate, ListLevelProgressionsInputSchema, input)
      : undefined;
    return paginate(
      transport,
      "level_progressions",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, LevelProgressionCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateLevelProgressions };
}
