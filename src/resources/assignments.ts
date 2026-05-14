import type { Transport } from "../http/transport";
import { paginate } from "../http/paginate";
import {
  AssignmentCollectionSchema,
  AssignmentEnvelopeSchema,
  ListAssignmentsInputSchema,
  type AssignmentCollection,
  type AssignmentEnvelope,
  type ListAssignmentsInput,
} from "../schemas/assignment";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createAssignmentsResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(id: number): Promise<AssignmentEnvelope> {
      const raw = await transport.request<unknown>({ path: `assignments/${id}` });
      return validateOutput(validate, AssignmentEnvelopeSchema, raw);
    },
    async list(input?: ListAssignmentsInput): Promise<AssignmentCollection> {
      const parsed = input ? validateInput(validate, ListAssignmentsInputSchema, input) : undefined;
      const raw = await transport.request<unknown>({
        path: "assignments",
        query: parsed as never,
      });
      return validateOutput(validate, AssignmentCollectionSchema, raw);
    },
    paginate(input?: ListAssignmentsInput) {
      const parsed = input ? validateInput(validate, ListAssignmentsInputSchema, input) : undefined;
      return paginate(
        transport,
        "assignments",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, AssignmentCollectionSchema, raw),
      );
    },
  };
}
