import { WanikaniError } from "./errors";
import type { RequestOptions, TransportResult } from "./transport";

/**
 * Validators echoed back from previous responses. The consumer stores these
 * alongside its cached data (ADR-0004: the consumer owns the cache; the SDK
 * stays stateless).
 *
 * Pass them as the trailing argument to a resource `get`/`list` method to opt
 * into a conditional request. `ifModifiedSince` accepts a `Date` (formatted to
 * HTTP-date via `toUTCString()`) or a raw string (echo of a `Last-Modified`
 * value).
 */
export interface CacheValidators {
  /** ETag from a previous response to the same request. */
  ifNoneMatch?: string;
  /** Last-Modified from a previous response, or any point in time. */
  ifModifiedSince?: Date | string;
}

/** 200 with a fresh body — plus the validators to store for next time. */
export interface Fresh<T> {
  notModified: false;
  data: T;
  etag: string | null;
  lastModified: string | null;
}

/** 304 — the cached copy is still good. */
export interface NotModified {
  notModified: true;
  /** 304 responses may still carry an ETag; surfaced if present. */
  etag: string | null;
}

/**
 * Result of a conditional resource call: either fresh data plus the
 * validators to cache, or a signal that the cached copy is still current.
 */
export type ConditionalResponse<T> = Fresh<T> | NotModified;

/**
 * Translates opted-in validators into transport request options. A `Date` is
 * formatted to HTTP-date via `toUTCString()`; a string is passed through
 * verbatim.
 */
export function conditionalHeaders(
  validators: CacheValidators | undefined,
): Pick<RequestOptions, "ifNoneMatch" | "ifModifiedSince"> {
  if (!validators) return {};
  return {
    ifNoneMatch: validators.ifNoneMatch,
    ifModifiedSince:
      validators.ifModifiedSince instanceof Date
        ? validators.ifModifiedSince.toUTCString()
        : validators.ifModifiedSince,
  };
}

/**
 * Resource-layer wrap/unwrap decision: a 304 becomes `NotModified`, fresh data
 * is parsed (`validateOutput`) and either returned bare (plain call) or
 * wrapped with its validators (conditional call).
 */
export function wrapConditional<T>(
  result: TransportResult<unknown>,
  validators: CacheValidators | undefined,
  parse: (raw: unknown) => T,
): T | ConditionalResponse<T> {
  if (result.notModified) return { notModified: true, etag: result.etag };
  const data = parse(result.body);
  if (validators === undefined) return data;
  return {
    notModified: false,
    data,
    etag: result.etag,
    lastModified: result.lastModified,
  };
}

/**
 * Unwraps the body of a request that never sends conditional headers
 * (mutations, pagination). A 304 is unreachable there, but the transport no
 * longer throws on it, so narrow defensively.
 */
export function unwrapBody<T>(result: TransportResult<T>): T {
  if (result.notModified) {
    throw new WanikaniError("Unexpected 304 Not Modified on an unconditional request");
  }
  return result.body;
}
