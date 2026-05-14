import type { Transport } from "../http/transport";
import { paginate } from "../http/paginate";
import {
  ListSubjectsInputSchema,
  SubjectCollectionSchema,
  SubjectEnvelopeSchema,
  type ListSubjectsInput,
  type SubjectCollection,
  type SubjectEnvelope,
} from "../schemas/subject";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createSubjectsResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(id: number): Promise<SubjectEnvelope> {
      const raw = await transport.request<unknown>({ path: `subjects/${id}` });
      return validateOutput(validate, SubjectEnvelopeSchema, raw);
    },
    async list(input?: ListSubjectsInput): Promise<SubjectCollection> {
      const parsed = input ? validateInput(validate, ListSubjectsInputSchema, input) : undefined;
      const raw = await transport.request<unknown>({
        path: "subjects",
        query: parsed as never,
      });
      return validateOutput(validate, SubjectCollectionSchema, raw);
    },
    paginate(input?: ListSubjectsInput) {
      const parsed = input ? validateInput(validate, ListSubjectsInputSchema, input) : undefined;
      return paginate(transport, "subjects", parsed as Record<string, unknown> | undefined, (raw) =>
        validateOutput(validate, SubjectCollectionSchema, raw),
      );
    },
  };
}
