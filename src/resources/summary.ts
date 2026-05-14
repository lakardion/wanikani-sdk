import type { Transport } from "../http/transport";
import { SummaryEnvelopeSchema, type SummaryEnvelope } from "../schemas/summary";
import { type ValidateContext, validateOutput } from "./validate";

export function createSummaryResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(): Promise<SummaryEnvelope> {
      const raw = await transport.request<unknown>({ path: "summary" });
      return validateOutput(validate, SummaryEnvelopeSchema, raw);
    },
  };
}
