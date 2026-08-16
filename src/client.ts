import { Transport } from "./http/transport";
import { NullRateLimiter, TokenBucket, type RateLimiter } from "./http/rate-limit";
import { WanikaniError } from "./http/errors";
import type { UnknownFieldsCallback, ValidatePolicy } from "./resources/validate";

import { createUserResource } from "./resources/user";
import { createSummaryResource } from "./resources/summary";
import { createSubjectsResource } from "./resources/subjects";
import { createAssignmentsResource } from "./resources/assignments";
import { createReviewStatisticsResource } from "./resources/review-statistics";
import { createStudyMaterialsResource } from "./resources/study-materials";
import { createLevelProgressionsResource } from "./resources/level-progressions";
import { createResetsResource } from "./resources/resets";
import { createSpacedRepetitionSystemsResource } from "./resources/spaced-repetition-systems";
import { createVoiceActorsResource } from "./resources/voice-actors";

export interface WanikaniClientOptions {
  apiKey?: string;
  revision?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  rateLimit?: { rpm: number } | false;
  validate?: ValidatePolicy;
  onUnknownFields?: UnknownFieldsCallback;
}

const DEFAULT_REVISION = "20170710";
const DEFAULT_BASE_URL = "https://api.wanikani.com/v2/";
const DEFAULT_RPM = 60;

export class WanikaniClient {
  readonly user: ReturnType<typeof createUserResource>;
  readonly summary: ReturnType<typeof createSummaryResource>;
  readonly subjects: ReturnType<typeof createSubjectsResource>;
  readonly assignments: ReturnType<typeof createAssignmentsResource>;
  readonly reviewStatistics: ReturnType<typeof createReviewStatisticsResource>;
  readonly studyMaterials: ReturnType<typeof createStudyMaterialsResource>;
  readonly levelProgressions: ReturnType<typeof createLevelProgressionsResource>;
  readonly resets: ReturnType<typeof createResetsResource>;
  readonly spacedRepetitionSystems: ReturnType<typeof createSpacedRepetitionSystemsResource>;
  readonly voiceActors: ReturnType<typeof createVoiceActorsResource>;

  constructor(options: WanikaniClientOptions = {}) {
    const apiKey = options.apiKey ?? readEnv("WANIKANI_API_KEY");
    if (!apiKey) {
      throw new WanikaniError(
        "WanikaniClient: missing API key. Pass `apiKey` or set WANIKANI_API_KEY in the environment.",
      );
    }
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new WanikaniError(
        "WanikaniClient: global fetch is not available. Pass `fetch` explicitly or upgrade the runtime.",
      );
    }

    const baseUrl = ensureTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
    const rateLimiter = makeRateLimiter(options.rateLimit);
    const validate = {
      policy: options.validate ?? ("both" as ValidatePolicy),
      onUnknownFields: options.onUnknownFields,
    };

    const transport = new Transport({
      apiKey,
      baseUrl,
      revision: options.revision ?? DEFAULT_REVISION,
      fetch: fetchImpl.bind(globalThis),
      rateLimiter,
    });

    this.user = createUserResource(transport, validate);
    this.summary = createSummaryResource(transport, validate);
    this.subjects = createSubjectsResource(transport, validate);
    this.assignments = createAssignmentsResource(transport, validate);
    this.reviewStatistics = createReviewStatisticsResource(transport, validate);
    this.studyMaterials = createStudyMaterialsResource(transport, validate);
    this.levelProgressions = createLevelProgressionsResource(transport, validate);
    this.resets = createResetsResource(transport, validate);
    this.spacedRepetitionSystems = createSpacedRepetitionSystemsResource(transport, validate);
    this.voiceActors = createVoiceActorsResource(transport, validate);
  }
}

function makeRateLimiter(option: WanikaniClientOptions["rateLimit"]): RateLimiter {
  if (option === false) return new NullRateLimiter();
  const rpm = option?.rpm ?? DEFAULT_RPM;
  return new TokenBucket({ capacity: rpm, refillPerSecond: rpm / 60 });
}

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[key];
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}
