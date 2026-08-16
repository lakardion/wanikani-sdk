# 0002. Pass through unknown API fields; report them via an opt-in callback

- **Status:** Accepted

## Context

WaniKani folds non-breaking changes — including brand-new response fields — into **all** API revisions without any version bump (this is how `kana_vocabulary` and `spaced_repetition_systems` appeared under revision 20170710). The SDK's schemas previously used `v.object`, which **silently strips** unknown fields. This already caused silent data loss: the API sends `level` on assignment payloads and `audio/webm` as a pronunciation-audio content type, and the SDK dropped both without any signal. A strict allowlist guarantees the SDK is perpetually a revision behind; failing loudly on unknown fields would let a WaniKani deploy break consumers at runtime.

## Decision

Schemas **pass through unknown fields** (valibot `v.looseObject` rather than `v.object`): known fields stay typed and validated, unknown fields ride along untyped. Consumers can use new API fields immediately, before the SDK types them.

Because `looseObject` does not report which fields were unknown, the validation layer (`src/resources/validate.ts`) additionally **diffs the raw response's keys against the schema's known keys** and reports the remainder through an opt-in client option:

```ts
new WanikaniClient({
  onUnknownFields: (path, fields) => { /* log, telemetry, throw — consumer's choice */ },
})
```

**Silent by default** — the SDK never writes to the consumer's console unprompted. Without the callback, unknown fields pass through quietly.

## Consequences

- The SDK never silently loses API data again, and never breaks when WaniKani adds fields.
- Known fields are still typed explicitly as they're discovered — passthrough is the safety net, not a substitute for maintaining schemas. The currently known gaps (assignment `level`, `audio/webm`, structured audio/image `metadata`) still get typed.
- The warning exists only for consumers who opt in; drift between the API and the SDK's types may go unnoticed by default.
