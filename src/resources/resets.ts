import type { Transport } from "../http/transport";
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
  return {
    async get(id: number): Promise<ResetEnvelope> {
      const raw = await transport.request<unknown>({ path: `resets/${id}` });
      return validateOutput(validate, ResetEnvelopeSchema, raw);
    },
    async list(input?: ListResetsInput): Promise<ResetCollection> {
      const parsed = input ? validateInput(validate, ListResetsInputSchema, input) : undefined;
      const raw = await transport.request<unknown>({
        path: "resets",
        query: parsed as never,
      });
      return validateOutput(validate, ResetCollectionSchema, raw);
    },
    paginate(input?: ListResetsInput) {
      const parsed = input ? validateInput(validate, ListResetsInputSchema, input) : undefined;
      return paginate(transport, "resets", parsed as Record<string, unknown> | undefined, (raw) =>
        validateOutput(validate, ResetCollectionSchema, raw),
      );
    },
  };
}
