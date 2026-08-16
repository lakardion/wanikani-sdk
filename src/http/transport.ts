import { WanikaniApiError, WanikaniError, WanikaniRateLimitError } from "./errors";
import type { RateLimiter } from "./rate-limit";

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  revision: string;
  fetch: typeof globalThis.fetch;
  rateLimiter: RateLimiter;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  path: string;
  query?: QueryParams;
  body?: unknown;
  ifModifiedSince?: string;
  ifNoneMatch?: string;
}

export type QueryParams = Record<
  string,
  string | number | boolean | readonly (string | number)[] | null | undefined
>;

/**
 * Outcome of a single request: either a fresh body plus the response's cache
 * validators (`ETag` / `Last-Modified`, `null` when absent), or a 304 — the
 * caller's cached copy is still good. The resource layer decides whether to
 * wrap this in a public `ConditionalResponse` or unwrap the bare body.
 */
export type TransportResult<T> =
  | { notModified: false; body: T; etag: string | null; lastModified: string | null }
  | { notModified: true; etag: string | null };

const SERVICE_UNAVAILABLE_BACKOFF_MS = 2000;

export class Transport {
  private readonly options: TransportOptions;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(options: TransportOptions) {
    this.options = options;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = options.now ?? (() => Date.now());
  }

  async request<T>(opts: RequestOptions): Promise<TransportResult<T>> {
    const url = this.buildUrl(opts.path, opts.query);
    const init = this.buildInit(opts);

    const first = await this.attempt(url, init);
    if (first.kind === "ok") {
      return {
        notModified: false,
        body: first.body as T,
        etag: first.etag,
        lastModified: first.lastModified,
      };
    }
    if (first.kind === "not_modified") return { notModified: true, etag: first.etag };

    // Hard one-retry cap. Only retry transient signals.
    if (first.kind === "retryable") {
      if (first.reason === "rate_limit") {
        const waitMs = computeRateLimitWait(first.resetEpochSeconds, this.now);
        await this.sleep(waitMs);
      } else if (first.reason === "service_unavailable") {
        await this.sleep(SERVICE_UNAVAILABLE_BACKOFF_MS);
      }

      const second = await this.attempt(url, init);
      if (second.kind === "ok") {
        return {
          notModified: false,
          body: second.body as T,
          etag: second.etag,
          lastModified: second.lastModified,
        };
      }
      if (second.kind === "not_modified") return { notModified: true, etag: second.etag };
      throw toError(second, url);
    }

    throw toError(first, url);
  }

  private async attempt(url: string, init: RequestInit): Promise<AttemptResult> {
    await this.options.rateLimiter.acquire();

    let response: Response;
    try {
      response = await this.options.fetch(url, init);
    } catch (err) {
      return {
        kind: "retryable",
        reason: "network",
        cause: err,
      };
    }

    if (response.status === 304) {
      return { kind: "not_modified", etag: response.headers.get("ETag") };
    }
    if (response.status >= 200 && response.status < 300) {
      const body = (await response.json()) as unknown;
      return {
        kind: "ok",
        body,
        etag: response.headers.get("ETag"),
        lastModified: response.headers.get("Last-Modified"),
      };
    }

    if (response.status === 429) {
      const reset = response.headers.get("RateLimit-Reset");
      return {
        kind: "retryable",
        reason: "rate_limit",
        resetEpochSeconds: reset ? Number(reset) : null,
        body: await safeReadError(response),
      };
    }
    if (response.status === 503) {
      return {
        kind: "retryable",
        reason: "service_unavailable",
        body: await safeReadError(response),
      };
    }

    return {
      kind: "fatal",
      status: response.status,
      body: await safeReadError(response),
    };
  }

  private buildUrl(path: string, query: QueryParams | undefined): string {
    const url = new URL(path.replace(/^\//, ""), this.options.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          url.searchParams.set(key, value.join(","));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildInit(opts: RequestOptions): RequestInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      "Wanikani-Revision": this.options.revision,
      Accept: "application/json",
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.ifModifiedSince) headers["If-Modified-Since"] = opts.ifModifiedSince;
    if (opts.ifNoneMatch) headers["If-None-Match"] = opts.ifNoneMatch;

    const init: RequestInit = {
      method: opts.method ?? "GET",
      headers,
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
    return init;
  }
}

type AttemptResult =
  | { kind: "ok"; body: unknown; etag: string | null; lastModified: string | null }
  | { kind: "not_modified"; etag: string | null }
  | {
      kind: "retryable";
      reason: "rate_limit";
      resetEpochSeconds: number | null;
      body?: ApiErrorBody;
    }
  | { kind: "retryable"; reason: "service_unavailable"; body?: ApiErrorBody }
  | { kind: "retryable"; reason: "network"; cause: unknown }
  | { kind: "fatal"; status: number; body: ApiErrorBody };

interface ApiErrorBody {
  error?: string;
  code?: number;
}

function toError(result: AttemptResult, url: string): WanikaniError {
  if (result.kind === "fatal") {
    const message = result.body.error ?? `HTTP ${result.status}`;
    const code = result.body.code ?? result.status;
    return new WanikaniApiError(result.status, code, message, url);
  }
  if (result.kind === "retryable") {
    if (result.reason === "rate_limit") {
      const resetAt =
        result.resetEpochSeconds !== null && result.resetEpochSeconds !== undefined
          ? new Date(result.resetEpochSeconds * 1000)
          : null;
      const message = result.body?.error ?? "Rate limit exceeded";
      return new WanikaniRateLimitError(message, url, resetAt);
    }
    if (result.reason === "service_unavailable") {
      const message = result.body?.error ?? "Service unavailable";
      return new WanikaniApiError(503, result.body?.code ?? 503, message, url);
    }
    return new WanikaniError(`Network error talking to ${url}: ${describeCause(result.cause)}`);
  }
  return new WanikaniError(`Unexpected transport result at ${url}`);
}

function computeRateLimitWait(resetEpochSeconds: number | null, now: () => number): number {
  if (resetEpochSeconds === null) return 1000;
  const waitMs = resetEpochSeconds * 1000 - now();
  return Math.max(0, waitMs);
}

async function safeReadError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}
