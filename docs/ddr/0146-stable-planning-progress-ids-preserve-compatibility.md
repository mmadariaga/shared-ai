# DDR 0146: Stable planning progress ids remain compatibility keys while labels become user-facing

## Status

Accepted

## Context

The spec, design, and implementation progress plans already use stable ids such as `prereqs-and-change` and `prereqs-resolution` for worker events and coordinator-rendered state. Their first visible labels expose internal bookkeeping rather than the prerequisite action a user needs to understand. Renaming the ids would change the event contract and the plan assertions merely to make the internal names match the improved labels.

## Decision

Keep every existing planning progress id and its position unchanged, and change the first visible label in each planning phase to `Check prerequisites`. Add the spec phase's new `research` id only where the approved plan explicitly extends the plan shape; do not rename any existing id to match a label. The coordinator declarations and worker enumerations remain canonical peers after the label update.

## Alternatives Considered

- **Rename the prerequisite ids to match the new label** — rejected: event producers, plan assertions, and persisted invocation behavior consume the existing compatibility keys.
- **Retain the existing visible labels** — rejected: the progress panel would continue exposing internal resolution bookkeeping instead of the user-facing act.

## Consequences

The planning progress protocol remains compatible while its visible wording becomes legible. Future maintainers must understand that an internal id and its user-facing label are intentionally different, and any later id change still requires coordinated updates across event producers, adapters, workers, and tests. The decision fixes a compatibility property of the pipeline's records and behavior, so this is a DDR.

## Provenance

User — the decision and its alternatives were settled in Decision 1 of `openspec/changes/progress-plan-step-legibility/design.md`.
