# 0003. Two-tier SDK surface: faithful resources + composite app helpers in a separate namespace

- **Status:** Accepted

## Context

The SDK's reason to exist is a client app that builds LLM-generated Japanese lessons from the user's WaniKani data. That app's core questions — "all kanji I've learned", "what's due for review", "what changed since last login" — are _joins_ across WaniKani resources (assignments × subjects × review statistics), not single API calls. If those joins live only in the app, every consumer reimplements them; if they're mixed into the resource layer, the SDK's 1:1 mapping to the API gets blurred by opinionated, derived operations.

## Decision

The SDK has **two visibly separate tiers**:

1. **Resource tier** (existing, e.g. `client.assignments.list()`) — stays a faithful 1:1 transport of the WaniKani API. No derived behavior.
2. **Composite tier** — app-level helpers under a **separate namespace** (working name `client.app.*`, settled during interface design), because they deliberately drift from the raw API.

Six helpers are approved:

| Helper            | Joins                                                                                               | Filter object (server-side params where they exist)      |
| ----------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `learnedSubjects` | assignments(`started`) → subjects                                                                   | `types`, `levels`, `srsStages`, `burned`, `updatedAfter` |
| `lessonQueue`     | assignments(`immediately_available_for_lessons`) → subjects                                         | `types`, `levels`                                        |
| `reviewsDue`      | assignments(`immediately_available_for_review` / `available_before`) → subjects + review statistics | `types`, `levels`, `availableBefore`, `limit`            |
| `subjectProgress` | subjects + assignments + review statistics + study materials                                        | `ids`, `slugs`, `types`, `levels`                        |
| `levelStatus`     | user + level progressions + assignments (kanji gate)                                                | `level` (default: user's current)                        |
| `syncSince`       | parallel `updated_after` across assignments, review statistics, study materials, subjects           | `resources`                                              |

Design principles: filters map to **server-side query params** wherever one exists (client-side refinement only for derived criteria); helpers return **joined aggregates**, not raw envelopes; helpers paginate fully under the hood.

## Consequences

- Consumers get the app's core queries out of the box without reimplementing joins.
- The resource tier remains a trustworthy reference against the API docs.
- The composite tier is opinionated by design; new helpers require the same "joins + server-side filters" justification.
