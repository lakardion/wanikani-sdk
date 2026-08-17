import { describe, expect, it, mock } from "bun:test";
import { Transport } from "../src/http/transport";
import { NullRateLimiter } from "../src/http/rate-limit";
import { WanikaniRateLimitError } from "../src/http/errors";
import { mockFetch, mockRejectingFetch, mockResponse } from "./helpers";

function makeTransport(
  fetchImpl: typeof fetch,
  opts: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
) {
  return new Transport({
    apiKey: "test-key",
    baseUrl: "https://api.wanikani.test/v2/",
    revision: "20170710",
    fetch: fetchImpl,
    rateLimiter: new NullRateLimiter(),
    now: opts.now,
    sleep: opts.sleep,
  });
}

describe("Transport.request", () => {
  it("sends auth + revision headers and parses JSON", async () => {
    const fetchMock = mockFetch(mockResponse({ body: { ok: true } }));
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    const result = await transport.request<{ ok: boolean }>({ path: "user" });

    expect(result).toEqual({
      notModified: false,
      body: { ok: true },
      etag: null,
      lastModified: null,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.wanikani.test/v2/user");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Wanikani-Revision"]).toBe("20170710");
  });

  it("serializes array query params as comma-delimited and skips empties", async () => {
    const fetchMock = mockFetch(mockResponse({ body: { ok: true } }));
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    await transport.request({
      path: "subjects",
      query: { ids: [1, 2, 3], types: [], levels: undefined, hidden: false },
    });

    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.searchParams.get("ids")).toBe("1,2,3");
    expect(url.searchParams.has("types")).toBe(false);
    expect(url.searchParams.has("levels")).toBe(false);
    expect(url.searchParams.get("hidden")).toBe("false");
  });

  it("captures ETag and Last-Modified from 2xx responses", async () => {
    const fetchMock = mockFetch(
      mockResponse({
        body: { ok: true },
        headers: { ETag: '"v1"', "Last-Modified": "Wed, 01 Jan 2024 00:00:00 GMT" },
      }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    const result = await transport.request<{ ok: boolean }>({ path: "user" });

    expect(result).toEqual({
      notModified: false,
      body: { ok: true },
      etag: '"v1"',
      lastModified: "Wed, 01 Jan 2024 00:00:00 GMT",
    });
  });

  it("returns a not_modified result with the ETag on 304 without throwing", async () => {
    const fetchMock = mockFetch(mockResponse({ status: 304, headers: { ETag: '"same"' } }));
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    const result = await transport.request({
      path: "user",
      ifNoneMatch: '"same"',
    });

    expect(result).toEqual({ notModified: true, etag: '"same"' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends If-None-Match and If-Modified-Since headers when requested", async () => {
    const fetchMock = mockFetch(mockResponse({ status: 304 }));
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    await transport.request({
      path: "user",
      ifNoneMatch: '"abc"',
      ifModifiedSince: "Wed, 01 Jan 2024 00:00:00 GMT",
    });

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["If-None-Match"]).toBe('"abc"');
    expect(headers["If-Modified-Since"]).toBe("Wed, 01 Jan 2024 00:00:00 GMT");
  });

  it("throws WanikaniApiError on deterministic 4xx without retrying", async () => {
    const fetchMock = mockFetch(
      mockResponse({ status: 403, body: { error: "Forbidden", code: 403 } }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    await expect(transport.request({ path: "user" })).rejects.toMatchObject({
      name: "WanikaniApiError",
      status: 403,
      code: 403,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once on 429 then surfaces WanikaniRateLimitError", async () => {
    const now = mock(() => 1_000_000_000_000);
    const sleep = mock(async () => undefined);
    const fetchMock = mockFetch(
      mockResponse({
        status: 429,
        body: { error: "Rate limit exceeded", code: 429 },
        headers: { "RateLimit-Reset": "1000000001" },
      }),
      mockResponse({
        status: 429,
        body: { error: "Rate limit exceeded", code: 429 },
        headers: { "RateLimit-Reset": "1000000002" },
      }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch, { now, sleep });

    await expect(transport.request({ path: "user" })).rejects.toBeInstanceOf(
      WanikaniRateLimitError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once on 429 and returns body if retry succeeds", async () => {
    const sleep = mock(async () => undefined);
    const fetchMock = mockFetch(
      mockResponse({
        status: 429,
        body: { error: "Rate limit exceeded", code: 429 },
        headers: { "RateLimit-Reset": "1000000001" },
      }),
      mockResponse({ body: { ok: true } }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch, {
      now: () => 1_000_000_000_000,
      sleep,
    });

    const result = await transport.request<{ ok: boolean }>({ path: "user" });
    expect(result).toMatchObject({ notModified: false, body: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on 503 then gives up", async () => {
    const sleep = mock(async () => undefined);
    const fetchMock = mockFetch(
      mockResponse({ status: 503, body: { error: "Service unavailable", code: 503 } }),
      mockResponse({ status: 503, body: { error: "Still down", code: 503 } }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch, { sleep });

    await expect(transport.request({ path: "user" })).rejects.toMatchObject({
      name: "WanikaniApiError",
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries 500", async () => {
    const fetchMock = mockFetch(
      mockResponse({ status: 500, body: { error: "Server error", code: 500 } }),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    await expect(transport.request({ path: "user" })).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on network error then surfaces it", async () => {
    const fetchMock = mockRejectingFetch(
      new TypeError("network down"),
      new TypeError("network still down"),
    );
    const transport = makeTransport(fetchMock as unknown as typeof fetch);

    await expect(transport.request({ path: "user" })).rejects.toThrow(/network still down/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
