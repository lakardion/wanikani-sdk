import type { Transport } from "../http/transport";
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
  return {
    async get(id: number): Promise<SpacedRepetitionSystemEnvelope> {
      const raw = await transport.request<unknown>({
        path: `spaced_repetition_systems/${id}`,
      });
      return validateOutput(validate, SpacedRepetitionSystemEnvelopeSchema, raw);
    },
    async list(
      input?: ListSpacedRepetitionSystemsInput,
    ): Promise<SpacedRepetitionSystemCollection> {
      const parsed = input
        ? validateInput(validate, ListSpacedRepetitionSystemsInputSchema, input)
        : undefined;
      const raw = await transport.request<unknown>({
        path: "spaced_repetition_systems",
        query: parsed as never,
      });
      return validateOutput(validate, SpacedRepetitionSystemCollectionSchema, raw);
    },
    paginate(input?: ListSpacedRepetitionSystemsInput) {
      const parsed = input
        ? validateInput(validate, ListSpacedRepetitionSystemsInputSchema, input)
        : undefined;
      return paginate(
        transport,
        "spaced_repetition_systems",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, SpacedRepetitionSystemCollectionSchema, raw),
      );
    },
  };
}
