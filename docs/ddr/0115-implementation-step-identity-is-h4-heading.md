# DDR 0115: The implementation plan's step identity is its `#### Step N:` H4-with-colon heading

## Status

Accepted

## Context

Two heading conventions exist for implementation-plan steps. The landed artifact convention is `#### Step N:` — an H4 with colon, as written by the implementation plan template (`sai/instructions/_templates/implementation-plan.md:29`) and read by `sai/instructions/implement.md`'s re-run classification ("every `#### Step N:` section"). The schema scaffold (`openspec/schemas/sai-workflow/templates/implementation.md:9`) carries a different form, `## Step N —` (H2), which no landed plan follows. The apply step projection renders a task list from `implementation.md`'s step headings and keys each entry's stable identity on the heading integer, so the projection must commit to exactly one convention — and the wrong choice silently drops re-runs and audit-appended steps from the projected list.

## Decision

The implementation plan's step identity is the `#### Step N:` H4-with-colon heading. The apply step projection derives its stable ids (the heading's step integer) and labels (the heading text) from that convention, matching `implement.md`'s own re-run classification and the template; the schema scaffold's `## Step N —` H2 form is not a step identity.

## Alternatives Considered

- **Key on the schema scaffold's `## Step N —` (H2) form** — rejected: no landed plan follows it, so re-runs and audit-appended steps would escape the projection.
- **Regex over all headings** — rejected: would capture non-step headings and break stable ids.
- **Key on the `#### Step N:` artifact convention** — chosen: matches `implement.md`'s own re-run classification and the template.

## Consequences

The projection's entry identity is derived from the H4-with-colon convention; correcting the source convention later means re-deriving the list on live changes. The convention is fixed by the artifact corpus and by `implement.md`'s classification, so the projection keys on the only form a landed plan can carry. The decision states a property of the pipeline's artifacts that must hold at all times — the step identity is the H4-with-colon heading — which is why this record is a DDR.

## Provenance

Codebase-forced — the artifact corpus and `implement.md`'s classification already fix the convention; no real alternative exists. Recorded as Decision 1 in `design.md` with the `ddr` family marker.
