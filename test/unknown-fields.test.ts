import { describe, expect, it, mock } from "bun:test";
import { WanikaniClient } from "../src";
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

const kanjiData = {
  auxiliary_meanings: [],
  created_at: "2024-01-01T00:00:00.000000Z",
  document_url: "https://www.wanikani.com/kanji/one",
  hidden_at: null,
  lesson_position: 0,
  level: 1,
  meaning_mnemonic: "Mnemonic",
  meanings: [{ meaning: "One", primary: true, accepted_answer: true }],
  slug: "one",
  spaced_repetition_system_id: 1,
  amalgamation_subject_ids: [2],
  characters: "一",
  component_subject_ids: [1],
  meaning_hint: null,
  reading_hint: null,
  reading_mnemonic: "Reading mnemonic",
  readings: [{ reading: "いち", primary: true, accepted_answer: true, type: "onyomi" }],
  visually_similar_subject_ids: [],
};

function kanjiEnvelope(data: Record<string, unknown> = kanjiData) {
  return {
    id: 1,
    object: "kanji",
    url: "https://api.wanikani.test/v2/subjects/1",
    data_updated_at: "2024-01-01T00:00:00.000000Z",
    data,
  };
}

function radicalEnvelope(id: number, dataExtra: Record<string, unknown> = {}) {
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
      ...dataExtra,
    },
  };
}

function makeClient(body: unknown, onUnknownFields?: (path: string, fields: string[]) => void) {
  const fetchMock = mockFetch(mockResponse({ body }));
  const client = new WanikaniClient({
    apiKey: "test-key",
    fetch: fetchMock as never,
    rateLimit: false,
    onUnknownFields,
  });
  return client;
}

describe("onUnknownFields", () => {
  it("reports unknown top-level data fields, grouped under their object path", async () => {
    const onUnknownFields = mock();
    const body = structuredClone(userEnvelope) as Record<string, unknown>;
    const data = body.data as Record<string, unknown>;
    data.new_api_field = "x";
    data.another_new_field = 42;
    const client = makeClient(body, onUnknownFields);

    await client.user.get();

    expect(onUnknownFields).toHaveBeenCalledTimes(1);
    expect(onUnknownFields).toHaveBeenCalledWith("data", ["new_api_field", "another_new_field"]);
  });

  it("reports unknown nested fields with a dotted path", async () => {
    const onUnknownFields = mock();
    const body = structuredClone(userEnvelope);
    (body.data.subscription as Record<string, unknown>).new_tier = "super-lifetime";
    const client = makeClient(body, onUnknownFields);

    await client.user.get();

    expect(onUnknownFields).toHaveBeenCalledTimes(1);
    expect(onUnknownFields).toHaveBeenCalledWith("data.subscription", ["new_tier"]);
  });

  it("diffs a subject payload against the matched union variant", async () => {
    const onUnknownFields = mock();
    const data = {
      ...kanjiData,
      stroke_count: 1,
      readings: [{ ...kanjiData.readings[0], pitch: "heiban" }],
    };
    const client = makeClient(kanjiEnvelope(data), onUnknownFields);

    const subject = await client.subjects.get(1);

    expect(subject.data.characters).toBe("一");
    const calls = onUnknownFields.mock.calls as unknown as [string, string[]][];
    expect(calls).toHaveLength(2);
    expect(calls).toContainEqual(["data", ["stroke_count"]]);
    // `readings` only exists on the kanji variant; a wrong variant match would
    // have reported "readings" itself as unknown at "data".
    expect(calls).toContainEqual(["data.readings[0]", ["pitch"]]);
  });

  it("reports unknown fields inside collections with array-index paths", async () => {
    const onUnknownFields = mock();
    const envelope = radicalEnvelope(1, { extra_data_field: true }) as Record<string, unknown>;
    envelope.extra_envelope_field = "nope";
    const body = {
      object: "collection",
      url: "https://api.wanikani.test/v2/subjects",
      pages: { next_url: null, previous_url: null, per_page: 1 },
      total_count: 1,
      data_updated_at: "2024-01-01T00:00:00.000000Z",
      data: [envelope],
    };
    const client = makeClient(body, onUnknownFields);

    await client.subjects.list();

    const calls = onUnknownFields.mock.calls as unknown as [string, string[]][];
    expect(calls).toHaveLength(2);
    expect(calls).toContainEqual(["data[0]", ["extra_envelope_field"]]);
    expect(calls).toContainEqual(["data[0].data", ["extra_data_field"]]);
  });

  it("never fires for a fully-known payload", async () => {
    const onUnknownFields = mock();
    const client = makeClient(userEnvelope, onUnknownFields);

    await client.user.get();

    expect(onUnknownFields).not.toHaveBeenCalled();
  });

  it("does not report on input validation", async () => {
    const onUnknownFields = mock();
    const client = makeClient(userEnvelope, onUnknownFields);

    await client.user.update({
      preferences: { lessons_batch_size: 5 },
      bogus_request_field: "stripped by input validation",
    } as never);

    expect(onUnknownFields).not.toHaveBeenCalled();
  });

  it("is silent and writes nothing to the console when no callback is registered", async () => {
    const warn = mock(console.warn);
    const error = mock(console.error);
    const log = mock(console.log);
    const body = structuredClone(userEnvelope) as Record<string, unknown>;
    (body.data as Record<string, unknown>).new_api_field = "x";
    const client = makeClient(body);

    const me = await client.user.get();

    expect(me.data.username).toBe("tester");
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
