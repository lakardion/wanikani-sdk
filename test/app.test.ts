import { describe, expect, it } from "bun:test";
import { WanikaniClient } from "../src";
import type { SubjectProgressFilter } from "../src";
import { mockFetch, mockResponse } from "./helpers";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE = "https://api.wanikani.com/v2";
const TS = "2024-01-01T00:00:00.000000Z";

function collectionOf(object: string, data: unknown[], nextUrl: string | null = null) {
  return {
    object: "collection",
    url: `${BASE}/${object}s`,
    pages: { next_url: nextUrl, previous_url: null, per_page: 500 },
    total_count: data.length,
    data_updated_at: TS,
    data,
  };
}

function kanjiSubject(id: number, level = 5, slug = `kanji-${id}`) {
  return {
    id,
    object: "kanji",
    url: `${BASE}/subjects/${id}`,
    data_updated_at: TS,
    data: {
      amalgamation_subject_ids: [],
      auxiliary_meanings: [],
      characters: "一",
      component_subject_ids: [],
      created_at: TS,
      document_url: `https://www.wanikani.com/kanji/${slug}`,
      hidden_at: null,
      lesson_position: 0,
      level,
      meaning_hint: null,
      meaning_mnemonic: "m",
      meanings: [{ meaning: "one", primary: true, accepted_answer: true }],
      reading_hint: null,
      reading_mnemonic: "r",
      readings: [
        { reading: "いち", primary: true, accepted_answer: true, type: "onyomi" as const },
      ],
      slug,
      spaced_repetition_system_id: 1,
      visually_similar_subject_ids: [],
    },
  };
}

function assignment(id: number, subjectId: number, srsStage = 3) {
  return {
    id,
    object: "assignment",
    url: `${BASE}/assignments/${id}`,
    data_updated_at: TS,
    data: {
      available_at: TS,
      burned_at: null,
      created_at: TS,
      hidden: false,
      passed_at: null,
      resurrected_at: null,
      srs_stage: srsStage,
      started_at: TS,
      subject_id: subjectId,
      subject_type: "kanji",
      unlocked_at: TS,
    },
  };
}

function reviewStatistic(id: number, subjectId: number) {
  return {
    id,
    object: "review_statistic",
    url: `${BASE}/review_statistics/${id}`,
    data_updated_at: TS,
    data: {
      created_at: TS,
      hidden: false,
      meaning_correct: 4,
      meaning_current_streak: 2,
      meaning_incorrect: 1,
      meaning_max_streak: 3,
      percentage_correct: 80,
      reading_correct: 4,
      reading_current_streak: 4,
      reading_incorrect: 0,
      reading_max_streak: 4,
      subject_id: subjectId,
      subject_type: "kanji",
    },
  };
}

function studyMaterial(id: number, subjectId: number) {
  return {
    id,
    object: "study_material",
    url: `${BASE}/study_materials/${id}`,
    data_updated_at: TS,
    data: {
      created_at: TS,
      hidden: false,
      meaning_note: "note",
      meaning_synonyms: ["syn"],
      reading_note: null,
      subject_id: subjectId,
      subject_type: "kanji",
    },
  };
}

function levelProgression(id: number, level: number) {
  return {
    id,
    object: "level_progression",
    url: `${BASE}/level_progressions/${id}`,
    data_updated_at: TS,
    data: {
      abandoned_at: null,
      completed_at: null,
      created_at: TS,
      level,
      passed_at: null,
      started_at: TS,
      unlocked_at: TS,
    },
  };
}

function userEnvelope(level = 5) {
  return {
    object: "user",
    url: `${BASE}/user`,
    data_updated_at: TS,
    data: {
      id: "user-1",
      username: "tester",
      level,
      profile_url: "https://www.wanikani.com/users/tester",
      started_at: TS,
      current_vacation_started_at: null,
      subscription: { active: true, max_level_granted: 60, period_ends_at: null, type: "lifetime" },
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
}

function makeClient(fetchMock: unknown) {
  return new WanikaniClient({ apiKey: "test-key", fetch: fetchMock as never, rateLimit: false });
}

function calledUrl(fetchMock: ReturnType<typeof mockFetch>, index: number): URL {
  return new URL(fetchMock.mock.calls[index]![0] as string);
}

// ---------------------------------------------------------------------------
// learnedSubjects
// ---------------------------------------------------------------------------

describe("client.app.learnedSubjects", () => {
  it("maps camelCase filters to server-side assignment query params", async () => {
    const fetchMock = mockFetch(mockResponse({ body: collectionOf("assignment", []) }));
    const client = makeClient(fetchMock);

    const result = await client.app.learnedSubjects({
      types: ["kanji"],
      levels: [1, 2],
      srsStages: [1, 2, 3, 4],
      burned: false,
      updatedAfter: "2024-06-01T00:00:00.000000Z",
    });

    expect(result).toEqual([]);
    const url = calledUrl(fetchMock, 0);
    expect(url.pathname).toBe("/v2/assignments");
    expect(url.searchParams.get("started")).toBe("true");
    expect(url.searchParams.get("subject_types")).toBe("kanji");
    expect(url.searchParams.get("levels")).toBe("1,2");
    expect(url.searchParams.get("srs_stages")).toBe("1,2,3,4");
    expect(url.searchParams.get("burned")).toBe("false");
    expect(url.searchParams.get("updated_after")).toBe("2024-06-01T00:00:00.000000Z");
    // Zero assignments → no follow-up subjects request.
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it("paginates assignments fully, then joins the batched subjects", async () => {
    const nextUrl = `${BASE}/assignments?started=true&page_after_id=2`;
    const fetchMock = mockFetch(
      mockResponse({
        body: collectionOf("assignment", [assignment(1, 101), assignment(2, 102)], nextUrl),
      }),
      mockResponse({ body: collectionOf("assignment", [assignment(3, 103)]) }),
      mockResponse({
        body: collectionOf("subject", [kanjiSubject(101), kanjiSubject(102), kanjiSubject(103)]),
      }),
    );
    const client = makeClient(fetchMock);

    const learned = await client.app.learnedSubjects();

    expect(learned.map((l) => l.subject.id)).toEqual([101, 102, 103]);
    expect(learned[0]!.assignment.id).toBe(1);
    // Third call is the batched subjects fetch.
    const url = calledUrl(fetchMock, 2);
    expect(url.pathname).toBe("/v2/subjects");
    expect(url.searchParams.get("ids")).toBe("101,102,103");
  });

  it("chunks batched subjects?ids= requests to stay under URL length limits", async () => {
    const assignments = Array.from({ length: 201 }, (_, i) => assignment(i + 1, 1000 + i));
    const chunk1 = Array.from({ length: 200 }, (_, i) => kanjiSubject(1000 + i));
    const chunk2 = [kanjiSubject(1200)];
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("assignment", assignments) }),
      mockResponse({ body: collectionOf("subject", chunk1) }),
      mockResponse({ body: collectionOf("subject", chunk2) }),
    );
    const client = makeClient(fetchMock);

    const learned = await client.app.learnedSubjects();

    expect(learned.length).toBe(201);
    expect(fetchMock.mock.calls.length).toBe(3);
    expect(calledUrl(fetchMock, 1).searchParams.get("ids")!.split(",").length).toBe(200);
    expect(calledUrl(fetchMock, 2).searchParams.get("ids")).toBe("1200");
  });
});

// ---------------------------------------------------------------------------
// lessonQueue
// ---------------------------------------------------------------------------

describe("client.app.lessonQueue", () => {
  it("uses immediately_available_for_lessons and joins subjects", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("assignment", [assignment(1, 101)]) }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(101)]) }),
    );
    const client = makeClient(fetchMock);

    const queue = await client.app.lessonQueue({ types: ["kanji"], levels: [5] });

    expect(queue).toHaveLength(1);
    expect(queue[0]!.subject.id).toBe(101);
    const url = calledUrl(fetchMock, 0);
    expect(url.searchParams.get("immediately_available_for_lessons")).toBe("true");
    expect(url.searchParams.get("subject_types")).toBe("kanji");
    expect(url.searchParams.get("levels")).toBe("5");
  });
});

// ---------------------------------------------------------------------------
// reviewsDue
// ---------------------------------------------------------------------------

describe("client.app.reviewsDue", () => {
  it("defaults to immediately_available_for_review=true and joins stats (null before first review)", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("assignment", [assignment(1, 101), assignment(2, 102)]) }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(101), kanjiSubject(102)]) }),
      // Only subject 101 has statistics — 102 is due for its FIRST review.
      mockResponse({ body: collectionOf("review_statistic", [reviewStatistic(1, 101)]) }),
    );
    const client = makeClient(fetchMock);

    const due = await client.app.reviewsDue();

    expect(due).toHaveLength(2);
    expect(due[0]!.reviewStatistic?.data.percentage_correct).toBe(80);
    expect(due[1]!.reviewStatistic).toBeNull();
    const url = calledUrl(fetchMock, 0);
    expect(url.searchParams.get("immediately_available_for_review")).toBe("true");
    expect(url.searchParams.has("available_before")).toBe(false);
    // Review statistics are fetched by subject_ids.
    expect(calledUrl(fetchMock, 2).searchParams.get("subject_ids")).toBe("101,102");
  });

  it("forecasts via available_before when availableBefore is set", async () => {
    const fetchMock = mockFetch(mockResponse({ body: collectionOf("assignment", []) }));
    const client = makeClient(fetchMock);

    await client.app.reviewsDue({ availableBefore: "2024-06-02T00:00:00.000000Z" });

    const url = calledUrl(fetchMock, 0);
    expect(url.searchParams.get("available_before")).toBe("2024-06-02T00:00:00.000000Z");
    expect(url.searchParams.has("immediately_available_for_review")).toBe(false);
  });

  it("applies limit client-side after the join, in API order", async () => {
    const fetchMock = mockFetch(
      mockResponse({
        body: collectionOf("assignment", [
          assignment(1, 101),
          assignment(2, 102),
          assignment(3, 103),
        ]),
      }),
      mockResponse({
        body: collectionOf("subject", [kanjiSubject(101), kanjiSubject(102), kanjiSubject(103)]),
      }),
      mockResponse({ body: collectionOf("review_statistic", []) }),
    );
    const client = makeClient(fetchMock);

    const due = await client.app.reviewsDue({ limit: 2 });

    expect(due.map((d) => d.subject.id)).toEqual([101, 102]);
  });
});

// ---------------------------------------------------------------------------
// subjectProgress
// ---------------------------------------------------------------------------

describe("client.app.subjectProgress", () => {
  // Compile-time guarantee (no runtime test needed): `SubjectProgressFilter`
  // is `AtLeastOne<SubjectProgressFilterBase>`, so `subjectProgress({})` and
  // `subjectProgress()` are type errors.
  const typeCheck: SubjectProgressFilter = { slugs: ["suru"] };
  void typeCheck;

  it("maps filters to subjects query params and joins all three side resources with nulls", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("subject", [kanjiSubject(101), kanjiSubject(102)]) }),
      mockResponse({ body: collectionOf("assignment", [assignment(1, 101)]) }),
      mockResponse({ body: collectionOf("review_statistic", [reviewStatistic(1, 101)]) }),
      mockResponse({ body: collectionOf("study_material", [studyMaterial(1, 102)]) }),
    );
    const client = makeClient(fetchMock);

    const progress = await client.app.subjectProgress({ slugs: ["kanji-101", "kanji-102"] });

    expect(progress).toHaveLength(2);
    expect(progress[0]!.assignment?.id).toBe(1);
    expect(progress[0]!.reviewStatistic?.id).toBe(1);
    expect(progress[0]!.studyMaterial).toBeNull();
    expect(progress[1]!.assignment).toBeNull();
    expect(progress[1]!.reviewStatistic).toBeNull();
    expect(progress[1]!.studyMaterial?.id).toBe(1);

    const subjectsUrl = calledUrl(fetchMock, 0);
    expect(subjectsUrl.pathname).toBe("/v2/subjects");
    expect(subjectsUrl.searchParams.get("slugs")).toBe("kanji-101,kanji-102");
    expect(calledUrl(fetchMock, 1).searchParams.get("subject_ids")).toBe("101,102");
    expect(calledUrl(fetchMock, 3).pathname).toBe("/v2/study_materials");
  });

  it("passes ids/types/levels straight through to the subjects query", async () => {
    const fetchMock = mockFetch(mockResponse({ body: collectionOf("subject", []) }));
    const client = makeClient(fetchMock);

    const result = await client.app.subjectProgress({ ids: [1, 2], types: ["kanji"], levels: [1] });

    expect(result).toEqual([]);
    const url = calledUrl(fetchMock, 0);
    expect(url.searchParams.get("ids")).toBe("1,2");
    expect(url.searchParams.get("types")).toBe("kanji");
    expect(url.searchParams.get("levels")).toBe("1");
    // No subjects → no follow-up joins.
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// levelStatus
// ---------------------------------------------------------------------------

describe("client.app.levelStatus", () => {
  it("defaults the level from GET /user and builds the kanji gate", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: userEnvelope(7) }),
      mockResponse({
        body: collectionOf("level_progression", [levelProgression(1, 6), levelProgression(2, 7)]),
      }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(201, 7), kanjiSubject(202, 7)]) }),
      mockResponse({ body: collectionOf("assignment", [assignment(9, 201, 5)]) }),
    );
    const client = makeClient(fetchMock);

    const status = await client.app.levelStatus();

    expect(status.level).toBe(7);
    expect(status.progression?.id).toBe(2);
    expect(status.kanjiGate).toHaveLength(2);
    expect(status.kanjiGate[0]!.assignment?.data.srs_stage).toBe(5);
    // Kanji 202 has no assignment yet (locked) → null join.
    expect(status.kanjiGate[1]!.assignment).toBeNull();

    expect(calledUrl(fetchMock, 0).pathname).toBe("/v2/user");
    const kanjiUrl = calledUrl(fetchMock, 2);
    expect(kanjiUrl.searchParams.get("types")).toBe("kanji");
    expect(kanjiUrl.searchParams.get("levels")).toBe("7");
  });

  it("honors an explicit level (no /user call) and returns null progression when absent", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("level_progression", [levelProgression(1, 6)]) }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(201, 3)]) }),
      mockResponse({ body: collectionOf("assignment", []) }),
    );
    const client = makeClient(fetchMock);

    const status = await client.app.levelStatus({ level: 3 });

    expect(status.level).toBe(3);
    expect(status.progression).toBeNull();
    expect(calledUrl(fetchMock, 0).pathname).toBe("/v2/level_progressions");
  });
});

// ---------------------------------------------------------------------------
// syncSince
// ---------------------------------------------------------------------------

describe("client.app.syncSince", () => {
  it("syncs all four resources in parallel with updated_after, and returns since/fetchedAt", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("assignment", [assignment(1, 101)]) }),
      mockResponse({ body: collectionOf("review_statistic", [reviewStatistic(1, 101)]) }),
      mockResponse({ body: collectionOf("study_material", [studyMaterial(1, 101)]) }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(101)]) }),
    );
    const client = makeClient(fetchMock);

    const result = await client.app.syncSince("2024-06-01T00:00:00.000000Z");

    expect(result.since).toBe("2024-06-01T00:00:00.000000Z");
    expect(typeof result.fetchedAt).toBe("string");
    expect(result.assignments).toHaveLength(1);
    expect(result.reviewStatistics).toHaveLength(1);
    expect(result.studyMaterials).toHaveLength(1);
    expect(result.subjects).toHaveLength(1);
    for (const [i, path] of [
      "/v2/assignments",
      "/v2/review_statistics",
      "/v2/study_materials",
      "/v2/subjects",
    ].entries()) {
      const url = calledUrl(fetchMock, i);
      expect(url.pathname).toBe(path);
      expect(url.searchParams.get("updated_after")).toBe("2024-06-01T00:00:00.000000Z");
    }
  });

  it("only fetches the requested resources, and only those keys exist on the result", async () => {
    const fetchMock = mockFetch(
      mockResponse({ body: collectionOf("assignment", [assignment(1, 101)]) }),
      mockResponse({ body: collectionOf("subject", [kanjiSubject(101)]) }),
    );
    const client = makeClient(fetchMock);

    const result = await client.app.syncSince("2024-06-01T00:00:00.000000Z", {
      resources: ["assignments", "subjects"],
    });

    expect(fetchMock.mock.calls.length).toBe(2);
    expect(result.assignments).toHaveLength(1);
    expect(result.subjects).toHaveLength(1);
    expect("reviewStatistics" in result).toBe(false);
    expect("studyMaterials" in result).toBe(false);
    expect(result.since).toBe("2024-06-01T00:00:00.000000Z");
    expect(result.fetchedAt).toBeDefined();
  });
});
