import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { paginate } from "../http/paginate";
import {
  ListVoiceActorsInputSchema,
  VoiceActorCollectionSchema,
  VoiceActorEnvelopeSchema,
  type ListVoiceActorsInput,
  type VoiceActorCollection,
  type VoiceActorEnvelope,
} from "../schemas/voice-actor";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createVoiceActorsResource(transport: Transport, validate: ValidateContext) {
  async function get(id: number): Promise<VoiceActorEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<VoiceActorEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `voice_actors/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, VoiceActorEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListVoiceActorsInput): Promise<VoiceActorCollection>;
  async function list(
    input: ListVoiceActorsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<VoiceActorCollection>>;
  async function list(input?: ListVoiceActorsInput, validators?: CacheValidators) {
    const parsed = input ? validateInput(validate, ListVoiceActorsInputSchema, input) : undefined;
    const res = await transport.request<unknown>({
      path: "voice_actors",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, VoiceActorCollectionSchema, raw),
    );
  }

  function paginateVoiceActors(input?: ListVoiceActorsInput) {
    const parsed = input ? validateInput(validate, ListVoiceActorsInputSchema, input) : undefined;
    return paginate(
      transport,
      "voice_actors",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, VoiceActorCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateVoiceActors };
}
