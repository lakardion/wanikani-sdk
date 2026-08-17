import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import { SummaryEnvelopeSchema, type SummaryEnvelope } from "../schemas/summary";
import { type ValidateContext, validateOutput } from "./validate";

export function createSummaryResource(transport: Transport, validate: ValidateContext) {
  async function get(): Promise<SummaryEnvelope>;
  async function get(validators: CacheValidators): Promise<ConditionalResponse<SummaryEnvelope>>;
  async function get(validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: "summary",
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, SummaryEnvelopeSchema, raw),
    );
  }

  return { get };
}
