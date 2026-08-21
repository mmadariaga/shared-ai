# ADR 0167: Design/tasks/interfaces templates are structural skeletons

<!-- adr-index: pair-with 0166; refs 0162 -->

## Status

Accepted

## Context

The three OpenSpec templates `openspec/schemas/sai-workflow/templates/design.md`, `tasks.md`, and `interfaces.md` carried duplicated normative generation rules, endpoint tables, and semantic sentinel literals that the design worker never reads at write time. That duplication drifted from `sai/commands/design/instructions.md` (including a dead `## Endpoint Map` block) and forced dual maintenance with contract tests.

ADR 0166 makes the schema `instruction:` blocks authority pointers for the same three artifacts. ADR 0162 already reduced report/implementation schema templates to scaffolds with write-time authority pointers. This decision applies the heading-preserving skeleton pattern to the design-phase templates.

## Decision

Each of `templates/design.md`, `templates/tasks.md`, and `templates/interfaces.md` retains live headings and ordering needed to scaffold the artifact, may carry concise non-normative field comments, carries exactly one write-time-authority pointer to the matching Generate section in `sai/commands/design/instructions.md`, and contains no duplicated normative generation rules, endpoint tables, or semantic sentinel literals that tests must assert from the command instruction instead.

On `design.md`, drop `## Endpoint Map` and its table. On `interfaces.md`, do not retain the semantic `None — no step contracts` literal — named tests assert that sentinel against the command instruction.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Heading-preserving skeletons (chosen) | Preserves OpenSpec scaffold value without competing authority | Authors must follow the pointer for generation rules |
| Keep full normative template prose | Richer in-template guidance | Same drift class as schema instructions |
| Empty or near-empty templates | No duplication | Heading order is load-bearing for authors and structural tests |

## Consequences

- Contract tests assert structural heading/order/pointer contracts on templates and semantic rules on the command instruction only.
- Template maintenance is limited to headings, markers, concise comments, and the single authority pointer.
- Paired with ADR 0166 so instruction pointers and template skeletons land as one coherent single-source story.

## Provenance

derived — `openspec/changes/single-source-design-artifact-contracts/design.md`, Decision D2.
