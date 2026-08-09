# Change Overview Generation Instruction (shared contract)

Execute as a budget-routed generation subagent. This instruction is the single source of the generation contract for every generation and regeneration of `change-overview.md` — the same instruction governs every run, on every harness. The overview is a **derived projection, not a source of truth**: the five source artifacts remain authoritative and are never modified by generation.

## Write scope

Write exactly one file: `openspec/changes/{change-name}/change-overview.md`. The single-file write scope is strict: the generator writes ONLY this one artifact, and does NOT create, modify, or delete any other file — in particular none of the source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`), no project source file, no configuration file, and no other change artifact.

## Inputs

Read in parallel: `openspec/changes/{change-name}/proposal.md`, every file matching `openspec/changes/{change-name}/specs/**/*.md`, `openspec/changes/{change-name}/design.md`, `openspec/changes/{change-name}/tasks.md`, and `openspec/changes/{change-name}/interfaces.md`. The overview is derived ONLY from these five source artifacts — never from `implementation.md` or any implementation artifact, and never from conversation context.

## Output organization

Produce one structured review-oriented document organized by capability and behavior — NOT a concatenation of the source documents. Present, at minimum, these sections in this order:

1. `## Target State` — the overview's leading review section, projected from `design.md`:
   - `### Architecture Snapshot` — projected **verbatim** from `design.md`'s `### Architecture Snapshot` (the persisted authoritative snapshot; never reworded or synthesized).
   - `### File Manifest` — recomputed by the deterministic net fold over `tasks.md` per the fold contract in `sai/instructions/design.md`, then **validated against the persisted `### File Manifest` in `design.md`**. Project the persisted manifest only when the recomputed fold equals it; on divergence, report the source contradiction (naming both the `design.md` manifest and the `tasks.md` fold, their locations, and the one-line disagreement) and fail the transactional validation — never silently prefer either side.
   - No other subsection SHALL be emitted inside `## Target State`, and the two subsections SHALL NOT be reordered. Both follow the `design-target-state` `None` behavior, independently: `None — no planned public surfaces` plus a one-line reason, and `None — no files affected` plus a one-line reason.
2. `## Scope` — the change's in-scope / out-of-scope summary derived from `proposal.md` (Why / What Changes / Non-goals) and `design.md` (Goals / Non-Goals).
3. `## Target Architecture` — the finished-shape narrative: the Target State projection plus the Architecture Snapshot detail.
4. `## Requirements` — one subsection per capability from `specs/**/*.md`; normative requirement wording preserved faithfully, each cited to its source artifact.
5. `## Scenarios` — each requirement's scenarios, traceable within its capability.
6. `## Interfaces` — the per-step public signatures from `interfaces.md`'s `## Step N` sections, keyed by Step N.
7. `## Assertions` — the method-level test assertions from `interfaces.md`'s Test assertions, anchored to their requirements/scenarios.
8. `## File Changes` — the File Manifest projection.
9. `## Delivery Steps` — the `tasks.md` steps in order, keyed by Step N.
10. `## Traceability` — end-to-end links per capability: requirement → scenarios → interfaces → assertions → delivery steps. Every link SHALL trace to an occurrence in a source artifact. The traceability SHALL be exactly the content the sources already encode (the shared `Step N` keys of `tasks.md` and `interfaces.md`, the assertion→requirement anchors in `interfaces.md`, the requirement→scenario structure of `specs/**/*.md`) — never synthesized.

## Fidelity rules

- Reproduce normative requirements and scenarios faithfully to their source wording — do NOT silently reword, strengthen, weaken, or reinterpret normative content. Cite the source artifact for derived content.
- Do NOT modify any source artifact; do NOT silently repair or invent source semantics to resolve gaps or contradictions.
- **Non-blocking gaps** — a relationship the overview must present that the sources do not encode (for example a requirement with no anchored assertion, or a step with no testable assertion) is recorded explicitly in the overview as a gap report naming the missing element and the source artifact involved. The overview MAY still validate and be accepted.
- **Blocking source contradictions** — two source artifacts stating conflicting facts about the change (for example the persisted `### File Manifest` in `design.md` diverging from the recomputed fold over `tasks.md`, or two requirements contradicting each other) are NOT resolved or fabricated: report the contradiction naming both sources and their locations with the one-line disagreement, and fail the transactional validation.

## Validation before write

Validate the produced overview against its sources before writing: every required section is present; every statement in the overview traces to a source; no statement in the overview contradicts a source. A generated overview that fails validation SHALL NOT be left as the change's overview. Produce the complete new overview content, validate it in full against the sources, and only then write `change-overview.md` in a single atomic write — never partially written or partially validated output.

## Closed result envelope

Return exactly five mandatory fields:

- `status` — success | failed
- `changed_files` — `[openspec/changes/{change-name}/change-overview.md]` on success; the stale record file on a failed regeneration; `[]` on a failed first materialization that wrote nothing
- `validation` — `passed` | `failed`
- `contradiction_details` — on a blocking-contradiction failure, both conflicting source locations and the one-line disagreement; the empty string otherwise
- `failure_kind` — `none` on success; on failure one of `blocking-contradiction` | `validation-failed` | `generation-error`

On a failed regeneration (validation failure including a blocking source contradiction, or a generation error), atomically replace `change-overview.md` with an explicit stale record stating that regeneration failed and the overview is not current; when the failure is a blocking source contradiction, the stale record SHALL carry the contradiction details — not a generic failure message. A failed first materialization writes nothing.
