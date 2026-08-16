# WaniKani API v2 — Complete Surface Inventory (Revision 20170710)

**Primary source:** the official API reference at <https://docs.api.wanikani.com/20170710/> (fetched 2025; the page is a self-contained Slate-generated static HTML document — no JS rendering needed, everything is in the single page).

> **Note on the docs source repo:** the often-mentioned `wanikani/api-docs` GitHub repository **does not exist** (github.com/wanikani/api-docs returns 404, and `gh search repos owner:wanikani` shows no such repo). The single-page HTML above is the authoritative primary source.

Base URL for all endpoints: `https://api.wanikani.com/v2/`. Auth: `Authorization: Bearer <api_token>` header on every request; HTTPS only.

Anchor citations below refer to `https://docs.api.wanikani.com/20170710/#<anchor>`.

---

## 1. Resource inventory

Source: [#resources](https://docs.api.wanikani.com/20170710/#resources) (left-nav TOC + per-resource H1 sections).

The docs list **exactly 11 resources** — no others exist:

| #   | Resource                  | Object type(s)                                      | Endpoints                |
| --- | ------------------------- | --------------------------------------------------- | ------------------------ |
| 1   | Assignments               | `assignment`                                        | 3                        |
| 2   | Level Progressions        | `level_progression`                                 | 2                        |
| 3   | Resets                    | `reset`                                             | 2                        |
| 4   | Reviews                   | `review`                                            | 3 (2 of them deprecated) |
| 5   | Review Statistics         | `review_statistic`                                  | 2                        |
| 6   | Spaced Repetition Systems | `spaced_repetition_system`                          | 2                        |
| 7   | Study Materials           | `study_material`                                    | 4                        |
| 8   | Subjects                  | `radical`, `kanji`, `vocabulary`, `kana_vocabulary` | 2                        |
| 9   | Summary                   | `report`                                            | 1                        |
| 10  | User                      | `user`                                              | 2                        |
| 11  | Voice Actors              | `voice_actor`                                       | 2                        |

**Total: 25 endpoints.**

Object types that are _not_ singular resources: `collection` and `report` (envelope types). The full object-type list is documented under [#object-types](https://docs.api.wanikani.com/20170710/#object-types): `assignment`, `kana_vocabulary`, `kanji`, `level_progression`, `radical`, `reset`, `review_statistic`, `review`, `spaced_repetition_system`, `study_material`, `user`, `vocabulary`, `voice_actor`.

---

## 2. Response envelopes, pagination, filters, errors

Source: [#response-structure](https://docs.api.wanikani.com/20170710/#response-structure), [#pagination](https://docs.api.wanikani.com/20170710/#pagination), [#filters](https://docs.api.wanikani.com/20170710/#filters), [#errors](https://docs.api.wanikani.com/20170710/#errors).

**Resource envelope:** `{ id, object, url, data_updated_at, data }`.

**Collection envelope:** `{ object: "collection", url, pages: { next_url, previous_url, per_page }, total_count, data_updated_at, data: [...] }`. `data_updated_at` on a collection is the max update timestamp across the whole scope (not limited by pagination); `null` if the scope is empty.

**Report envelope** (used only by Summary): `{ object: "report", url, data_updated_at, data }` — no `pages`/`total_count`.

**Pagination:**

- Default page size **500**; **reviews and subjects have a max of 1,000**.
- Cursor-based: the resource `id` is the cursor. `page_after_id=<id>` / `page_before_id=<id>` query params move forward/backward.
- `pages.next_url` / `pages.previous_url` are `null` at the ends; `per_page` echoes the page size; `total_count` is the full scoped count.
- A cursor outside the collection's id range returns an empty `data` array.

**Filters:** collection query params; array-typed params are comma-delimited (`?subject_ids=8,16,64`); single values also valid.

**Errors:** body shape `{ "error": <string>, "code": <integer> }`. Documented status codes: `200`, `401` ("Unauthorized. Nice try."), `403`, `404`, `409`, `422` (malformed request description), `429`, `500`, `503`.

**Data types:** standard JSON types; dates are ISO 8601 rounded to the microsecond (JS date-format standard). [#data-types](https://docs.api.wanikani.com/20170710/#data-types)

---

## 3. Endpoints per resource (exhaustive)

All collection endpoints additionally accept the pagination params `page_after_id` / `page_before_id`.

### 3.1 Assignments — [#assignments](https://docs.api.wanikani.com/20170710/#assignments)

User progress on a subject: current SRS state + milestone timestamps. Created when a subject's components are passed and the subject is at/below the user's level.

| Method & path                    | What it does                                                                                    | Params                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/assignments`            | Collection of all assignments, ascending `created_at`, 500/page                                 | **Query:** `available_after` (Date), `available_before` (Date), `burned` (Bool), `hidden` (Bool), `ids` (int[]), `immediately_available_for_lessons` (flag), `immediately_available_for_review` (flag), `in_review` (flag), `levels` (int[], 1–60), `srs_stages` (int[], 0–9), `started` (Bool), `subject_ids` (int[]), `subject_types` (string[]: `kana_vocabulary`, `kanji`, `radical`, `vocabulary`), `unlocked` (Bool), `updated_after` (Date) |
| `GET /v2/assignments/<id>`       | Single assignment                                                                               | **Path:** `id` (int). Note: `unlocked_at < started_at < passed_at < burned_at` are always sequential                                                                                                                                                                                                                                                                                                                                               |
| `PUT /v2/assignments/<id>/start` | Mark assignment as started (moves from lesson queue → review queue); returns updated assignment | **Body:** `{ "assignment": { "started_at": Date? } }` — `started_at` optional, defaults to request time, must be ≥ `unlocked_at`. **Preconditions:** `level ≤ min(user.level, subscription.max_level_granted)`, `srs_stage == 0`, `started_at == null`, `unlocked_at != null`. **Side effects:** sets `available_at`, `srs_stage → 1`, `started_at`                                                                                                |

### 3.2 Level Progressions — [#level-progressions](https://docs.api.wanikani.com/20170710/#level-progressions)

Progress through WaniKani levels; created when ≥90% of the level's kanji assignments are passed (and subscription allows the level). Docs warn history is incomplete for older users (logging added late).

| Method & path                     | What it does                                 | Params                                           |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| `GET /v2/level_progressions`      | Collection, ascending `created_at`, 500/page | **Query:** `ids` (int[]), `updated_after` (Date) |
| `GET /v2/level_progressions/<id>` | Single level progression                     | **Path:** `id` (int)                             |

### 3.3 Resets — [#resets](https://docs.api.wanikani.com/20170710/#resets)

Records of user-initiated resets to a target level ≤ current level; assignments/review_statistics at/above target are set back to default state.

| Method & path         | What it does                                 | Params                                           |
| --------------------- | -------------------------------------------- | ------------------------------------------------ |
| `GET /v2/resets`      | Collection, ascending `created_at`, 500/page | **Query:** `ids` (int[]), `updated_after` (Date) |
| `GET /v2/resets/<id>` | Single reset                                 | **Path:** `id` (int)                             |

### 3.4 Reviews — [#reviews](https://docs.api.wanikani.com/20170710/#reviews)

Submitted to update an assignment + its review statistic after a subject is fully answered once. Lesson quizzes must NOT use this — use assignment `start` instead.

| Method & path          | What it does                                                                                                                                                                                                                                                                                                   | Params                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/reviews`      | **DEPRECATED** — WaniKani no longer stores review data; always returns an empty collection (`per_page` 1000 in the example)                                                                                                                                                                                    | none documented                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /v2/reviews/<id>` | **DEPRECATED** — always responds HTTP 404                                                                                                                                                                                                                                                                      | **Path:** `id` (int)                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /v2/reviews/`    | Creates a review: updates the assignment and associated review statistic; response includes `resources_updated.assignment` and `resources_updated.review_statistic`. Review is **not persisted** — returned review always has `id: 0`. Requirement: assignment `available_at` must be non-null and in the past | **Body** (`review` wrapper): `assignment_id` (int — this **or** `subject_id` required), `subject_id` (int — this **or** `assignment_id` required), `incorrect_meaning_answers` (int ≥ 0, required), `incorrect_reading_answers` (int ≥ 0, required; 0 for radicals), `created_at` (Date, optional; defaults to request time; must be in the past but after `assignment.available_at`) |

### 3.5 Review Statistics — [#review-statistics](https://docs.api.wanikani.com/20170710/#review-statistics)

Aggregate correct/incorrect counts, streaks, and percentage per subject. Created on first review of the subject.

| Method & path                    | What it does                                 | Params                                                                                                                                                                                |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/review_statistics`      | Collection, ascending `created_at`, 500/page | **Query:** `hidden` (Bool), `ids` (int[]), `percentages_greater_than` (int), `percentages_less_than` (int), `subject_ids` (int[]), `subject_types` (string[]), `updated_after` (Date) |
| `GET /v2/review_statistics/<id>` | Single review statistic                      | **Path:** `id` (int)                                                                                                                                                                  |

### 3.6 Spaced Repetition Systems — [#spaced-repetition-systems](https://docs.api.wanikani.com/20170710/#spaced-repetition-systems)

SRS definitions used for `srs_stage` calculations; related to subjects.

| Method & path                            | What it does                         | Params                                           |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| `GET /v2/spaced_repetition_systems`      | Collection, ascending `id`, 500/page | **Query:** `ids` (int[]), `updated_after` (Date) |
| `GET /v2/spaced_repetition_systems/<id>` | Single SRS                           | **Path:** `id` (int)                             |

### 3.7 Study Materials — [#study-materials](https://docs.api.wanikani.com/20170710/#study-materials)

User-specific notes and meaning synonyms per subject. One study material per subject per user.

| Method & path                  | What it does                                                                        | Params                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/study_materials`      | Collection, ascending `created_at`, 500/page                                        | **Query:** `hidden` (Bool), `ids` (int[]), `subject_ids` (int[]), `subject_types` (string[]), `updated_after` (Date)                               |
| `GET /v2/study_materials/<id>` | Single study material                                                               | **Path:** `id` (int)                                                                                                                               |
| `POST /v2/study_materials/`    | Create a study material for a `subject_id` (only one per subject per API-key owner) | **Body** (`study_material` wrapper): `subject_id` (int, required), `meaning_note` (string), `reading_note` (string), `meaning_synonyms` (string[]) |
| `PUT /v2/study_materials/<id>` | Update a study material                                                             | **Body** (`study_material` wrapper): `meaning_note` (string), `reading_note` (string), `meaning_synonyms` (string[]) — all optional                |

### 3.8 Subjects — [#subjects](https://docs.api.wanikani.com/20170710/#subjects)

The radicals, kanji, vocabulary, and kana_vocabulary learned via lessons/reviews — dictionary data plus level/relationship info.

| Method & path           | What it does                                                      | Params                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/subjects`      | Collection of all subjects, ascending `created_at`, **1000/page** | **Query:** `ids` (int[]), `types` (string[]: `radical`, `kanji`, `vocabulary`, `kana_vocabulary`), `slugs` (string[]), `levels` (int[]), `hidden` (Bool), `updated_after` (Date) |
| `GET /v2/subjects/<id>` | Single subject; response shape depends on subject type            | **Path:** `id` (int)                                                                                                                                                             |

### 3.9 Summary — [#summary](https://docs.api.wanikani.com/20170710/#summary)

| Method & path     | What it does                                                                                                            | Params |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| `GET /v2/summary` | Report of currently available lessons and reviews, plus reviews becoming available in the next 24 hours grouped by hour | none   |

### 3.10 User — [#user](https://docs.api.wanikani.com/20170710/#user)

| Method & path  | What it does                                  | Params                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v2/user` | Summary of the user identified by the API key | none                                                                                                                                                                                                                                                                                                                                        |
| `PUT /v2/user` | Update user preferences; returns updated user | **Body** (`user.preferences` wrapper — only preferences are updatable): `extra_study_autoplay_audio` (Bool), `lessons_autoplay_audio` (Bool), `lessons_batch_size` (int), `reviews_autoplay_audio` (Bool), `reviews_display_srs_indicator` (Bool), `reviews_presentation_order` (string: `shuffled` or `lower_levels_first`) — all optional |

### 3.11 Voice Actors — [#voice-actors](https://docs.api.wanikani.com/20170710/#voice-actors)

| Method & path               | What it does                                 | Params                                           |
| --------------------------- | -------------------------------------------- | ------------------------------------------------ |
| `GET /v2/voice_actors`      | Collection, ascending `created_at`, 500/page | **Query:** `ids` (int[]), `updated_after` (Date) |
| `GET /v2/voice_actors/<id>` | Single voice actor                           | **Path:** `id` (int)                             |

---

## 4. Data structures per resource (field inventory)

Every resource has the envelope fields `id`, `object`, `url`, `data_updated_at`; the lists below are the **`data` payload fields** exactly as documented. (User is an exception: no top-level `id` envelope — its UUID `id` lives inside `data`.)

### Assignment

`available_at` (null|Date), `burned_at` (null|Date), `created_at` (Date), `hidden` (Bool), `passed_at` (null|Date), `resurrected_at` (null|Date), `srs_stage` (int), `started_at` (null|Date), `subject_id` (int), `subject_type` (string), `unlocked_at` (null|Date).

_Doc/example discrepancies worth knowing:_ the attribute table omits `level`, but the single-assignment and start-assignment example payloads include `level` (int). The create-review `resources_updated.assignment` example additionally shows `passed` (Bool) and `resurrected` (Bool) fields. Prerequisites for `unlocked_at`: components reached SRS stage 5 once, and user level ≥ subject level.

### Level Progression

`abandoned_at` (null|Date), `completed_at` (null|Date), `created_at` (Date), `level` (int, 1–60), `passed_at` (null|Date), `started_at` (null|Date), `unlocked_at` (null|Date).

### Reset

`confirmed_at` (null|Date), `created_at` (Date), `original_level` (int, 1–60), `target_level` (int, 1–60, ≤ original_level).

### Review

`assignment_id` (int), `created_at` (Date), `ending_srs_stage` (int, 1–9), `incorrect_meaning_answers` (int), `incorrect_reading_answers` (int), `spaced_repetition_system_id` (int), `starting_srs_stage` (int, 1–8), `subject_id` (int). Answer types per subject type: kana_vocabulary → meaning only; kanji → meaning+reading; radical → meaning only; vocabulary → meaning+reading. The SRS referenced is the one at review-creation time (history preserved).

### Review Statistic

`created_at` (Date), `hidden` (Bool), `meaning_correct` (int), `meaning_current_streak` (int), `meaning_incorrect` (int), `meaning_max_streak` (int), `percentage_correct` (int), `reading_correct` (int), `reading_current_streak` (int), `reading_incorrect` (int), `reading_max_streak` (int), `subject_id` (int), `subject_type` (string).

### Spaced Repetition System

`burning_stage_position` (int), `created_at` (Date), `description` (string), `name` (string), `passing_stage_position` (int), `starting_stage_position` (int), `unlocking_stage_position` (int), `stages` (array). Each stage object: `interval` (null|int), `interval_unit` (null|string: `milliseconds`, `seconds`, `minutes`, `hours`, `days`, `weeks`), `position` (int). Unlocking (position 0) and burning (max position) stages always have `null` interval/interval_unit. The `_position` fields align with assignment timestamps (unlocking→`unlocked_at`, passing→`passed_at`, etc.).

### Study Material

`created_at` (Date), `hidden` (Bool), `meaning_note` (string), `meaning_synonyms` (string[]), `reading_note` (string), `subject_id` (int), `subject_type` (string).

### Subject — common attributes (all 4 types)

`auxiliary_meanings` (obj[]), `characters` (string), `created_at` (Date), `document_url` (string), `hidden_at` (null|Date), `lesson_position` (int), `level` (int, 1–60), `meaning_mnemonic` (string), `meanings` (obj[]), `slug` (string), `spaced_repetition_system_id` (int).

- Meaning object: `meaning` (string), `primary` (Bool), `accepted_answer` (Bool).
- Auxiliary meaning object: `meaning` (string), `type` (string: `whitelist` | `blacklist`).
- Mnemonic/hint strings use WaniKani markup tags: `<radical>`, `<kanji>`, `<vocabulary>`, `<meaning>`, `<reading>` (kana-vocabulary examples also show `<ja>`).

### Subject — radical-specific

`amalgamation_subject_ids` (int[]), `characters` (**nullable** — not all radicals have a UTF entry), `character_images` (obj[]). Character image object: `url` (string), `content_type` (string — only `image/svg+xml`), `metadata` (object; for SVG: `inline_styles` Bool, always true/historical).

### Subject — kanji-specific

`amalgamation_subject_ids` (int[]), `component_subject_ids` (int[]), `meaning_hint` (null|string), `reading_hint` (null|string), `reading_mnemonic` (string), `readings` (obj[]), `visually_similar_subject_ids` (int[]). Kanji reading object: `reading` (string), `primary` (Bool), `accepted_answer` (Bool), `type` (string: `onyomi` | `kunyomi` | `nanori`).

### Subject — vocabulary-specific

`component_subject_ids` (int[]), `context_sentences` (obj[]), `meaning_mnemonic` (string), `parts_of_speech` (string[]), `pronunciation_audios` (obj[]), `readings` (obj[]), `reading_mnemonic` (string). Vocabulary reading object: `accepted_answer` (Bool), `primary` (Bool), `reading` (string) — **no `type` field** (unlike kanji). Context sentence: `en` (string), `ja` (string). Pronunciation audio: `url` (string), `content_type` (string — docs say `audio/mpeg` and `audio/ogg`; the kana-vocabulary example also shows `audio/webm`), `metadata` (object): `gender` (string), `source_id` (int), `pronunciation` (string), `voice_actor_id` (int), `voice_actor_name` (string), `voice_description` (string).

### Subject — kana_vocabulary-specific

`context_sentences` (obj[]), `meaning_mnemonic` (string), `parts_of_speech` (string[]), `pronunciation_audios` (obj[]). No `readings`, no `component_subject_ids` (it _is_ kana). Same nested object shapes as vocabulary.

### Summary (report)

`lessons` (obj[]: `available_at` Date — always top of the current hour, `subject_ids` int[]), `next_reviews_at` (null|Date — null when no reviews scheduled), `reviews` (obj[]: `available_at` Date — always top of an hour, `subject_ids` int[]; **25 objects** = now + next 24 hours).

### User

`id` (string, UUID), `username` (string), `level` (int — ignores subscription status), `profile_url` (string), `started_at` (Date — signup date), `current_vacation_started_at` (null|Date), `subscription` (object), `preferences` (object).

- Subscription object: `active` (Bool), `type` (string: `free` | `recurring` | `lifetime`; the Best Practices section also mentions an `unknown` state — treat as free and report), `max_level_granted` (int: 3 or 60), `period_ends_at` (null|Date — null for `free` and `lifetime`).
- Preferences object: `default_voice_actor_id` (int — **deprecated**, always 1, unsettable), `extra_study_autoplay_audio` (Bool), `lessons_autoplay_audio` (Bool), `lessons_batch_size` (int), `lessons_presentation_order` (string — **deprecated**, always `ascending_level_then_subject`, setting does nothing), `reviews_autoplay_audio` (Bool), `reviews_display_srs_indicator` (Bool), `reviews_presentation_order` (string: `shuffled` | `lower_levels_first`; default `shuffled`).

### Voice Actor

`description` (string), `gender` (string: `male` | `female`), `name` (string). Example payloads also include `created_at` (Date) though the attribute table doesn't list it.

---

## 5. Best Practices (full detail)

Source: [#best-practices](https://docs.api.wanikani.com/20170710/#best-practices) and subsections [#caching](https://docs.api.wanikani.com/20170710/#caching), [#conditional-requests](https://docs.api.wanikani.com/20170710/#conditional-requests), [#leveraging-the-updated_after-filter](https://docs.api.wanikani.com/20170710/#leveraging-the-updated_after-filter), [#respecting-subscription-restrictions](https://docs.api.wanikani.com/20170710/#respecting-subscription-restrictions).

Headline advice: **cache data locally whenever possible, make conditional requests to minimize network load, and use the `updated_after` filter**. Plus: respect subscription-based content access when building apps for other people.

### 5.1 Caching recommendations (per-resource volatility)

- **Subjects:** cache as aggressively as possible — infrequently updated, frequently needed; they tie together assignments, review statistics, and study materials.
- **Reviews and resets:** never change once recorded (but reviews are created frequently) → safe for long-term storage. _(Caveat: reviews are now deprecated/unpersisted server-side.)_
- **Assignments, review statistics, study materials:** moderate update levels; a level-up or subject pass causes a small flurry of creates/updates; updates become rarer as assignments advance through SRS stages.
- **Summary report:** changes **every hour** — caching may help offline use, but data is stale within an hour.
- **User:** updated infrequently, but changes are important to capture.
- Docs warn these recommendations may become outdated but will be communicated.

### 5.2 Conditional requests

- **`If-None-Match` and `If-Modified-Since` are accepted on every endpoint.** If the response body hasn't changed: **HTTP 304 + empty body** — faster since no full response is generated.
- Every response includes **`ETag`** and **`Last-Modified`** headers; feed them back via `If-None-Match` / `If-Modified-Since` respectively on future requests to the same endpoint.
- If **both** headers are sent, **`If-None-Match` takes precedence**.
- `If-Modified-Since` accepts a `Last-Modified` value **or any datetime** in HTTP-date format: `If-Modified-Since: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT` (always GMT). Example: `Fri, 11 Nov 2011 11:11:11 GMT`.

### 5.3 `updated_after` synchronization

- **All collection endpoints support `updated_after`** — returns only records updated after the given timestamp.
- Documented scenario ("Example/Scenario/Not a Fable"): a statistics site recalculating a user's progress on each login. Without `updated_after`, syncing assignments for a high-level user could take **18 sequential requests** plus full local diffing. With `updated_after` set to the user's last login, you get a small, fast, usually unpaginated response of only changed records.

### 5.4 Respecting subscription restrictions

- WaniKani content past **level 3** requires a paid subscription. Subject content (mnemonics, hints, relationships) is copyrighted by Tofugu — fair use covers personal learning use only.
- Rules for apps used by others: (1) **no for-profit use** of the content, (2) enforce subscription limits — both per WaniKani's terms.
- Enforcement via the user endpoint's `subscription` object:
  - `max_level_granted` — 3 (free) or 60 (subscribed); users must not access subjects above it; lessons/reviews above it are rejected server-side. First line of defense.
  - `active` — whether a paid subscription is active.
  - `type` + `period_ends_at` — `free` (no `period_ends_at`; never subscribed or lapsed), `recurring` (`period_ends_at` = renewal/expiry; access persists to period end even after cancellation, so you can skip checking until then), `lifetime` (`period_ends_at` null; still schedule occasional checks — refunds/payment issues happen), `unknown` (weird state; treat as `free` and report to WaniKani devs).

### 5.5 Rate limits

Source: [#rate-limit](https://docs.api.wanikani.com/20170710/#rate-limit).

- **60 requests per minute** is the only documented throttle.
- Exceeding it → **HTTP 429** with body message `Rate Limit Exceeded`. (The docs parenthetically mislabel 429 as "Forbidden" — it's Too Many Requests.)
- Response headers on every request:
  - `RateLimit-Limit` — limit for the current period.
  - `RateLimit-Remaining` — remaining quota for the current period.
  - `RateLimit-Reset` — epoch-seconds timestamp when the limit resets.
- Docs recommend using these headers to programmatically back off on 429.

---

## 6. Versioning / the `Wanikani-Revision` header

Source: [#revisions-aka-versioning](https://docs.api.wanikani.com/20170710/#revisions-aka-versioning).

- Revisions are **timestamps in `YYYYMMDD` format**, sent on every request via the header: `Wanikani-Revision: 20170710`.
- **Only breaking changes trigger a new revision.** A breaking change = anything changing the _existing structure_ of a response (e.g. renaming a field).
- **Non-breaking changes** — new resource attributes, whole new endpoints — are **available in all revisions**, including `20170710`.
- If no revision header is sent, the API **defaults to the first revision: `20170710`**.

**Consequence for `kana_vocabulary`:** yes — the `20170710` revision docs describe features added years later, by design. `kana_vocabulary` (added to WaniKani ~2023, per the example payload timestamps `2023-04/05`) appears throughout the 20170710 docs: in the object-type list, as a `subject_type` enum value in assignment/review-statistic/study-material filters, in the reviews answer-type table, and with its own subject attribute section. The kana-vocabulary example also documents `audio/webm` as a pronunciation-audio `content_type` beyond the originally documented `audio/mpeg`/`audio/ogg`. Likewise `spaced_repetition_systems` (2020 timestamps in examples) and user-preference deprecations are later non-breaking additions folded into the same revision docs.

---

## 7. Additional Information sections

Source: [#additional-information](https://docs.api.wanikani.com/20170710/#additional-information).

- **Spaced Repetition System** ([#spaced-repetition-system](https://docs.api.wanikani.com/20170710/#spaced-repetition-system)): an SRS has N sequential stages. Special positions: unlocking stage = 0 (initial; subject appears in lessons), starting stage = 1 (minimum reviewable stage), passing stage (milestone counting toward level progression/unlocks), burning stage = N (complete; exits reviews). Correct review → stage +1, available `interval` later at the **top of the hour**; incorrect answers → stage decreased based on wrong-answer count, then rescheduled per that stage's interval.
- **User Resets** ([#user-resets](https://docs.api.wanikani.com/20170710/#user-resets)): reset to any level ≤ current. Effects: explicit records under `resets`; a fresh `level_progression` for the target level; the abandoned level's progression gets `abandoned_at`; assignments and review_statistics for affected levels return to default state.
