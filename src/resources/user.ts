import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  unwrapBody,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
import {
  UpdateUserInputSchema,
  UserEnvelopeSchema,
  type UpdateUserInput,
  type UserEnvelope,
} from "../schemas/user";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createUserResource(transport: Transport, validate: ValidateContext) {
  async function get(): Promise<UserEnvelope>;
  async function get(validators: CacheValidators): Promise<ConditionalResponse<UserEnvelope>>;
  async function get(validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: "user",
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, UserEnvelopeSchema, raw),
    );
  }

  async function update(input: UpdateUserInput): Promise<UserEnvelope> {
    const body = { user: validateInput(validate, UpdateUserInputSchema, input) };
    const res = await transport.request<unknown>({
      path: "user",
      method: "PUT",
      body,
    });
    return validateOutput(validate, UserEnvelopeSchema, unwrapBody(res));
  }

  return { get, update };
}
