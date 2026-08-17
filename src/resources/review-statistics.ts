import type { Transport } from "../http/transport";
import {
  conditionalHeaders,
  wrapConditional,
  type CacheValidators,
  type ConditionalResponse,
} from "../http/conditional";
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
  async function get(id: number): Promise<ReviewStatisticEnvelope>;
  async function get(
    id: number,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<ReviewStatisticEnvelope>>;
  async function get(id: number, validators?: CacheValidators) {
    const res = await transport.request<unknown>({
      path: `review_statistics/${id}`,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, ReviewStatisticEnvelopeSchema, raw),
    );
  }

  async function list(input?: ListReviewStatisticsInput): Promise<ReviewStatisticCollection>;
  async function list(
    input: ListReviewStatisticsInput | undefined,
    validators: CacheValidators,
  ): Promise<ConditionalResponse<ReviewStatisticCollection>>;
  async function list(input?: ListReviewStatisticsInput, validators?: CacheValidators) {
    const parsed = input
      ? validateInput(validate, ListReviewStatisticsInputSchema, input)
      : undefined;
    const res = await transport.request<unknown>({
      path: "review_statistics",
      query: parsed as never,
      ...conditionalHeaders(validators),
    });
    return wrapConditional(res, validators, (raw) =>
      validateOutput(validate, ReviewStatisticCollectionSchema, raw),
    );
  }

  function paginateReviewStatistics(input?: ListReviewStatisticsInput) {
    const parsed = input
      ? validateInput(validate, ListReviewStatisticsInputSchema, input)
      : undefined;
    return paginate(
      transport,
      "review_statistics",
      parsed as Record<string, unknown> | undefined,
      (raw) => validateOutput(validate, ReviewStatisticCollectionSchema, raw),
    );
  }

  return { get, list, paginate: paginateReviewStatistics };
}
