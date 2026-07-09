# ADR 0022: interfaces.md is a standalone, step-keyed artifact rather than a section of tasks.md

## Status

Accepted

## Context

`sai-2-design` (shared instruction `sai/instructions/design.md`) emits `design.md` and `tasks.md` per change. Separating the *contract* (public signatures + exact test assertions) from its *consumption* is the precondition for a later slice (`interface-first-test-isolation`) where a blind test author writes tests from the signature alone, closing the code→test mirroring channel that RED→GREEN cannot close on its own.

The signatures and assertions had to live somewhere. Folding them into `tasks.md` would violate that file's conciseness rule (which excludes concrete signatures and exact assertion values as "detailed behavior") and would force the future blind test author to read implementation-adjacent narrative. Placing them in `design.md` would not be step-keyed and would couple the test contract to decision prose.

This is change `design-emits-interfaces-artifact` (slice 1 of 2), Decision D1.

## Decision

Emit a standalone artifact `openspec/changes/{name}/interfaces.md`, keyed by `## Step N` to `tasks.md`. Each step carries two bold-labeled parts matching `tasks.md`'s field idiom: `**Interfaces**` (signatures only — no body) and `**Test assertions**` (exact input→output/behavior assertions, each anchored to a `specs/**/*.md` requirement or scenario). The file is consumable without the implementation body: signature + anchored assertions suffice to author the tests.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Standalone step-keyed file (chosen) | Smallest unit the slice-2 blind test author can consume in isolation; keeps `tasks.md` clean; step-keyed so it aligns 1:1 with `tasks.md`/`implementation.md` | Adds a third per-change artifact and a schema registration with no consumer in this slice |
| A section inside `tasks.md` | No new file; single planning document | Violates `tasks.md`'s conciseness rule (excludes concrete signatures/assertions); forces the future blind test author to read implementation-adjacent narrative |
| A section inside `design.md` | Co-located with the decisions that motivate the contract | Not step-keyed; couples the test contract to decision prose |

## Consequences

- A new artifact `interfaces.md` is registered in `openspec/schemas/sai-workflow/schema.yaml` (`requires: [tasks]`) but excluded from `apply.requires`, since no stage consumes it in this slice.
- Slice 2 consumers (the blind test author) will bind to this separate file; folding the contract back into `tasks.md` afterwards would be costly, which is why the split is recorded here.
- The format's real sufficiency is only validated once slice 2 wires a consumer; this slice validates it in isolation via review.

## Related

- `openspec/changes/design-emits-interfaces-artifact/design.md` — Decision D1
- `openspec/changes/design-emits-interfaces-artifact/specs/design-interfaces-artifact/spec.md` — "sai-2-design emits interfaces.md", "Each step lists public signatures and exact test assertions", "interfaces.md is consumable without the implementation"
- `sai/instructions/design.md` — `### Generate interfaces.md` section added by this change
- `openspec/schemas/sai-workflow/schema.yaml` — `interfaces` artifact registration
