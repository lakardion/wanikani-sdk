import type { Transport } from "../http/transport";
import { paginate } from "../http/paginate";
import {
  LevelProgressionCollectionSchema,
  LevelProgressionEnvelopeSchema,
  ListLevelProgressionsInputSchema,
  type LevelProgressionCollection,
  type LevelProgressionEnvelope,
  type ListLevelProgressionsInput,
} from "../schemas/level-progression";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createLevelProgressionsResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(id: number): Promise<LevelProgressionEnvelope> {
      const raw = await transport.request<unknown>({ path: `level_progressions/${id}` });
      return validateOutput(validate, LevelProgressionEnvelopeSchema, raw);
    },
    async list(input?: ListLevelProgressionsInput): Promise<LevelProgressionCollection> {
      const parsed = input
        ? validateInput(validate, ListLevelProgressionsInputSchema, input)
        : undefined;
      const raw = await transport.request<unknown>({
        path: "level_progressions",
        query: parsed as never,
      });
      return validateOutput(validate, LevelProgressionCollectionSchema, raw);
    },
    paginate(input?: ListLevelProgressionsInput) {
      const parsed = input
        ? validateInput(validate, ListLevelProgressionsInputSchema, input)
        : undefined;
      return paginate(
        transport,
        "level_progressions",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, LevelProgressionCollectionSchema, raw),
      );
    },
  };
}
