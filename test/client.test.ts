import { describe, expect, it, mock } from "bun:test";
import { WanikaniClient } from "../src";
import { WanikaniError, WanikaniValidationError } from "../src/http/errors";
import { mockFetch, mockResponse } from "./helpers";

const userEnvelope = {
  object: "user",
  url: "https://api.wanikani.test/v2/user",
  data_updated_at: "2024-01-01T00:00:00.000000Z",
  data: {
    id: "user-1",
    username: "tester",
    level: 5,
    profile_url: "https://www.wanikani.com/users/tester",
    started_at: "2024-01-01T00:00:00.000000Z",
    current_vacation_started_at: null,
    subscription: {
      active: true,
      max_level_granted: 60,
      period_ends_at: null,
      type: "lifetime",
    },
    preferences: {
      default_voice_actor_id: 1,
      extra_study_autoplay_audio: false,
      lessons_autoplay_audio: false,
      lessons_batch_size: 5,
      lessons_presentation_order: "ascending_level_then_subject",
      reviews_autoplay_audio: false,
      reviews_display_srs_indicator: true,
    },
  },
};

describe("WanikaniClient", () => {
  it("throws synchronously when no API key is available", () => {
    const original = process.env.WANIKANI_API_KEY;
    delete process.env.WANIKANI_API_KEY;
    try {
      expect(() => new WanikaniClient({ fetch: mock(() => undefined) as never })).toThrow(
        WanikaniError,
      );
    } finally {
      if (original !== undefined) process.env.WANIKANI_API_KEY = original;
    }
  });

  it("user.get parses the envelope and returns typed data", async () => {
    const fetchMock = mockFetch(mockResponse({ body: userEnvelope }));
    const client = new WanikaniClient({
      apiKey: "test-key",
      fetch: fetchMock as never,
      rateLimit: false,
    });

    const me = await client.user.get();

    expect(me.object).toBe("user");
    expect(me.data.username).toBe("tester");
    expect(me.data.subscription.type).toBe("lifetime");
  });

  it("surfaces WanikaniValidationError when the server returns garbage and validation is on", async () => {
    const fetchMock = mockFetch(mockResponse({ body: { object: "user", data: { nope: true } } }));
    const client = new WanikaniClient({
      apiKey: "test-key",
      fetch: fetchMock as never,
      rateLimit: false,
    });

    await expect(client.user.get()).rejects.toBeInstanceOf(WanikaniValidationError);
  });

  it("skips output validation when validate: 'none'", async () => {
    const fetchMock = mockFetch(mockResponse({ body: { object: "user", data: { nope: true } } }));
    const client = new WanikaniClient({
      apiKey: "test-key",
      fetch: fetchMock as never,
      rateLimit: false,
      validate: "none",
    });

    const me = await client.user.get();
    expect((me as unknown as { object: string }).object).toBe("user");
  });

  it("translates 403 hibernating into a WanikaniApiError", async () => {
    const fetchMock = mockFetch(
      mockResponse({ status: 403, body: { error: "The user is hibernating", code: 403 } }),
    );
    const client = new WanikaniClient({
      apiKey: "test-key",
      fetch: fetchMock as never,
      rateLimit: false,
    });

    await expect(client.user.get()).rejects.toMatchObject({
      name: "WanikaniApiError",
      status: 403,
      code: 403,
    });
  });

  it("paginates subjects across next_url cursors", async () => {
    const page1 = {
      object: "collection",
      url: "https://api.wanikani.test/v2/subjects",
      pages: {
        next_url: "https://api.wanikani.test/v2/subjects?page_after_id=2",
        previous_url: null,
        per_page: 2,
      },
      total_count: 3,
      data_updated_at: "2024-01-01T00:00:00.000000Z",
      data: [radicalEnvelope(1), radicalEnvelope(2)],
    };
    const page2 = {
      object: "collection",
      url: "https://api.wanikani.test/v2/subjects?page_after_id=2",
      pages: { next_url: null, previous_url: null, per_page: 2 },
      total_count: 3,
      data_updated_at: "2024-01-01T00:00:00.000000Z",
      data: [radicalEnvelope(3)],
    };

    const fetchMock = mockFetch(mockResponse({ body: page1 }), mockResponse({ body: page2 }));
    const client = new WanikaniClient({
      apiKey: "test-key",
      fetch: fetchMock as never,
      rateLimit: false,
    });

    const collected: number[] = [];
    for await (const page of client.subjects.paginate({ types: ["radical"] })) {
      for (const env of page.data) collected.push(env.id);
    }
    expect(collected).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function radicalEnvelope(id: number) {
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
