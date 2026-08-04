# ADR 0095: Auto-answer grounding sources are bounded and exclude the explore conversation

<!-- adr-index: pair-with 0094 -->

## Status

Accepted

## Context

The objective grounding floor (ADR 0094) is only as strong as the set of sources it draws on. If "grounded" could mean "found anywhere in the explore chat", the floor would be trivially satisfiable — the whole conversation is always available — and the retired "infer an answer from explore context" permission would return under a new name, silently weakening the pipeline's existing context isolation (`openspec/specs/explore-context-isolation/spec.md`).

## Decision

Bound the permitted grounding sources to exactly three: the worker's own `needs_input` payload (its question and any offered options), the selected change's emitted crystallized block, and the artifacts the supervised spec phase has itself written so far (its `proposal.md` and `specs/**` in their current state).

Explicitly **exclude** the surrounding explore conversation, the design discussion or reasoning that preceded crystallization, prior reviewer or review-loop state, the spec worker's internal reasoning history, other project files, and unrelated repository context. A question answerable only from the conversation, or one that depends on a downstream plan, precedent, or diff explore does not hold, is treated as ungrounded and escalates.

## Alternatives Considered

- **Ground on the whole explore conversation** — richest source, matches how a human proxy would reason. Rejected: it is exactly the retired behavior and empties the objective floor, since the conversation is always present.
- **Ground on arbitrary repository content** — lets explore read neighbouring changes or precedent. Rejected: breaks context isolation and makes the grounding gate unbounded and unauditable.

## Consequences

- The grounding gate cannot be emptied by treating the conversation as a source, so the objective floor stays meaningful.
- Widening the source set later would silently weaken context isolation, which is why the bound is fixed and stated as an explicit exclusion list rather than an open "supervised context".
- The audit log's grounding citation always names one of the three bounded sources, keeping every auto-answer traceable to a permitted origin.

## Related

- `openspec/changes/add-pipeline-autonomous-question-answering/design.md` — Decision "Grounding sources are bounded to worker payload + crystallized block + phase artifacts, excluding the explore conversation"
- `openspec/changes/add-pipeline-autonomous-question-answering/specs/pipeline-question-autonomy/spec.md` — "The permitted grounding sources are bounded"
- `openspec/specs/explore-context-isolation/spec.md`
- `docs/adr/0094-qualitative-confidence-with-grounding-floor.md`
