import type { Transport } from "../http/transport";
import { paginate } from "../http/paginate";
import {
  ListReviewStatisticsInputSchema,
  ReviewStatisticCollectionSchema,
  ReviewStatisticEnvelopeSchema,
  type ListReviewStatisticsInput,
  type ReviewStatisticCollection,
  type ReviewStatisticEnvelope,
} from "../schemas/review-statistic";
import { type ValidateContext, validateInput, validateOutput } from "./validate";

export function createReviewStatisticsResource(transport: Transport, validate: ValidateContext) {
  return {
    async get(id: number): Promise<ReviewStatisticEnvelope> {
      const raw = await transport.request<unknown>({ path: `review_statistics/${id}` });
      return validateOutput(validate, ReviewStatisticEnvelopeSchema, raw);
    },
    async list(input?: ListReviewStatisticsInput): Promise<ReviewStatisticCollection> {
      const parsed = input
        ? validateInput(validate, ListReviewStatisticsInputSchema, input)
        : undefined;
      const raw = await transport.request<unknown>({
        path: "review_statistics",
        query: parsed as never,
      });
      return validateOutput(validate, ReviewStatisticCollectionSchema, raw);
    },
    paginate(input?: ListReviewStatisticsInput) {
      const parsed = input
        ? validateInput(validate, ListReviewStatisticsInputSchema, input)
        : undefined;
      return paginate(
        transport,
        "review_statistics",
        parsed as Record<string, unknown> | undefined,
        (raw) => validateOutput(validate, ReviewStatisticCollectionSchema, raw),
      );
    },
  };
}
