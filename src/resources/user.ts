import type { Transport } from "../http/transport";
import {
  UpdateUserInputSchema,
  UserEnvelopeSchema,
  type UpdateUserInput,
  type UserEnvelope,
} from "../schemas/user";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createUserResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(): Promise<UserEnvelope> {
      const raw = await transport.request<unknown>({ path: "user" });
      return validateOutput(validate, UserEnvelopeSchema, raw);
    },
    async update(input: UpdateUserInput): Promise<UserEnvelope> {
      const body = { user: validateInput(validate, UpdateUserInputSchema, input) };
      const raw = await transport.request<unknown>({
        path: "user",
        method: "PUT",
        body,
      });
      return validateOutput(validate, UserEnvelopeSchema, raw);
    },
  };
}
