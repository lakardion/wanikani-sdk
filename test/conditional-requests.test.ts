import { describe, expect, it } from "bun:test";
import { WanikaniClient } from "../src";
import { WanikaniValidationError } from "../src/http/errors";
import { mockFetch, mockResponse } from "./helpers";

const ETAG = '"W\\abc123"';
const LAST_MODIFIED = "Wed, 01 Jan 2024 00:00:00 GMT";

function makeClient(fetchMock: ReturnType<typeof mockFetch>) {
  return new WanikaniClient({
    apiKey: "test-key",
    fetch: fetchMock as never,
    rateLimit: false,
  });
}

function subjectEnvelope(id: number) {
  return {
    id,
    object: "radical",
    url: `https://api.wanikani.test/v2/subjects/${id}`,
    data_updated_at: "2024-01-01T00:00:00.000000Z",
    data: {
      auxiliary_meanings: [],
      created_at: "2024-01-01T00:00:00.000000Z",
      document_url: `https://www.wanikani.com/radicals/x-${id}`,
      hidden_at: null,
      lesson_position: 0,
      level: 1,
      meaning_mnemonic: "Test",
      meanings: [{ meaning: "Ground", primary: true, accepted_answer: true }],
      slug: `radical-${id}`,
      spaced_repetition_system_id: 1,
      amalgamation_subject_ids: [],
      characters: "一",
      character_images: [],
    },
  };
}

describe("conditional requests (ADR-0004)", () => {
  it("plain calls return bare data as before, even when the response has validators", async () => {
    const fetchMock = mockFetch(
      mockResponse({
        body: subjectEnvelope(1),
        headers: { ETag: ETAG, "Last-Modified": LAST_MODIFIED },
      }),
    );
    const client = makeClient(fetchMock);

    const subject = await client.subjects.get(1);

    expect(subject.object).toBe("radical");
    expect(subject.id).toBe(1);
    expect("notModified" in subject).toBe(false);
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["If-None-Match"]).toBeUndefined();
    expect(headers["If-Modified-Since"]).toBeUndefined();
  });

  it("sends If-None-Match and If-Modified-Since when validators are passed", async () => {
    const fetchMock = mockFetch(mockResponse({ body: subjectEnvelope(1) }));
    const client = makeClient(fetchMock);

    await client.subjects.get(1, { ifNoneMatch: ETAG, ifModifiedSince: LAST_MODIFIED });

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["If-None-Match"]).toBe(ETAG);
    expect(headers["If-Modified-Since"]).toBe(LAST_MODIFIED);
  });

  it("200 with validators returns wrapped data plus etag and lastModified", async () => {
    const fetchMock = mockFetch(
      mockResponse({
        body: subjectEnvelope(1),
        headers: { ETag: ETAG, "Last-Modified": LAST_MODIFIED },
      }),
    );
    const client = makeClient(fetchMock);

    const res = await client.subjects.get(1, { ifNoneMatch: '"stale"' });

    expect(res.notModified).toBe(false);
    if (res.notModified) throw new Error("expected a fresh response");
    expect(res.data.id).toBe(1);
    expect(res.data.object).toBe("radical");
    expect(res.etag).toBe(ETAG);
    expect(res.lastModified).toBe(LAST_MODIFIED);
  });

  it("304 returns { notModified: true, etag } without throwing", async () => {
    const fetchMock = mockFetch(mockResponse({ status: 304, headers: { ETag: ETAG } }));
    const client = makeClient(fetchMock);

    const res = await client.subjects.list({ types: ["radical"] }, { ifNoneMatch: ETAG });

    expect(res).toEqual({ notModified: true, etag: ETAG });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("formats Date ifModifiedSince as an HTTP-date", async () => {
    const fetchMock = mockFetch(mockResponse({ status: 304 }));
    const client = makeClient(fetchMock);
    const date = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));

    await client.subjects.get(1, { ifModifiedSince: date });

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["If-Modified-Since"]).toBe("Mon, 01 Jan 2024 00:00:00 GMT");
    expect(headers["If-Modified-Since"]).toBe(date.toUTCString());
  });

  it("still validates fresh data before wrapping it", async () => {
    const fetchMock = mockFetch(mockResponse({ body: { garbage: true } }));
    const client = makeClient(fetchMock);

    await expect(client.subjects.get(1, { ifNoneMatch: ETAG })).rejects.toBeInstanceOf(
      WanikaniValidationError,
    );
  });

  it("works on parameterless getters (user.get)", async () => {
    const fetchMock = mockFetch(mockResponse({ status: 304, headers: { ETag: ETAG } }));
    const client = makeClient(fetchMock);

    const res = await client.user.get({ ifNoneMatch: ETAG });

    expect(res).toEqual({ notModified: true, etag: ETAG });
  });

  it("surfaces null validators when the 200 response omits them", async () => {
    const fetchMock = mockFetch(mockResponse({ body: subjectEnvelope(1) }));
    const client = makeClient(fetchMock);

    const res = await client.subjects.get(1, { ifNoneMatch: ETAG });

    if (res.notModified) throw new Error("expected a fresh response");
    expect(res.etag).toBeNull();
    expect(res.lastModified).toBeNull();
  });
});
