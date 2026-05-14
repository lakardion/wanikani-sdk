import type { Transport } from "../http/transport";
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
  return {
    async get(id: number): Promise<VoiceActorEnvelope> {
      const raw = await transport.request<unknown>({ path: `voice_actors/${id}` });
      return validateOutput(validate, VoiceActorEnvelopeSchema, raw);
    },
    async list(input?: ListVoiceActorsInput): Promise<VoiceActorCollection> {
      const parsed = input ? validateInput(validate, ListVoiceActorsInputSchema, input) : undefined;
      const raw = await transport.request<unknown>({
        path: "voice_actors",
        query: parsed as never,
      });
      return validateOutput(validate, VoiceActorCollectionSchema, raw);
    },
    paginate(input?: ListVoiceActorsInput) {
      const parsed = input ? validateInput(validate, ListVoiceActorsInputSchema, input) : undefined;
      return paginate(
        transport,
        "voice_actors",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, VoiceActorCollectionSchema, raw),
      );
    },
  };
}
