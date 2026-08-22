# ADR 0166a: Schema design/tasks/interfaces instructions are authority pointers

<!-- adr-index: refs 0155a; refs 0162b -->

## Status

Accepted

## Context

The sai-workflow schema repeated the full generation contract for `design.md`, `tasks.md`, and `interfaces.md` in each artifact's `instruction:` block even though `sai/commands/design/instructions.md` is the only surface used at write time. The duplicated prose drifted from the live authority, including a dead Endpoint Map promise in the design artifact description.

ADR 0155a already established the informative-pointer pattern for the `change-overview` instruction. ADR 0162b established the same pattern for report and implementation schema templates. This decision extends the pointer pattern to the three design-phase artifact instruction blocks.

## Decision

Replace the full generation prose in the `design`, `tasks`, and `interfaces` artifact `instruction:` blocks in `openspec/schemas/sai-workflow/schema.yaml` with non-empty pointers that name `sai/commands/design/instructions.md` and the corresponding section (`### Generate design.md`, `### Generate tasks.md`, `### Generate interfaces.md`). Pointers identify the live authority; they do not restate generation rules. Correct the `design` artifact `description` so it no longer promises an Endpoint Map. Leave `generates`, `requires`, `apply.requires`, and `apply.tracks` unchanged.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Pointers only (chosen) | Single write-time source; schema stays informative | Schema readers must follow the pointer |
| Keep duplicated full instruction text | Discoverability in schema alone | Drift already produced dead Endpoint Map; dual maintenance |
| Delete `instruction:` blocks entirely | No duplication | Delta spec requires non-empty pointer blocks; CLI silence risk |

## Consequences

- Tests that asserted detailed generation rules against schema instruction bodies must retarget `sai/commands/design/instructions.md`.
- Schema instruction text becomes less prescriptive; maintenance of generation rules stays on the command instruction only.
- Pattern is consistent with ADR 0155a (change-overview) and ADR 0162b (report templates).

## Provenance

derived — `openspec/changes/single-source-design-artifact-contracts/design.md`, Decision D1.
