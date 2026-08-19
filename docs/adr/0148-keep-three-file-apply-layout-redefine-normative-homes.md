# ADR 0148: Keep the three-file apply layout; redefine normative homes

<!-- adr-index: refs 0083 -->

## Status

Accepted

## Context

Apply's three cards conflate a reusable phase-adapter surface with a standalone-invocation shell, restating routing STOP, plan selection, checklist authority, and scratch cleanup across cards. Merging files or inventing a fourth shell card would fight existing test pins and install layout without clarifying ownership.

## Decision

Preserve the three-file layout and load order `coordinator → invocation/shell → runner` for direct `/sai-4-apply`. Re-home each concern to exactly one normative section: shell owns prerequisites, change picker, standalone fast-track parse (detect/remove/set-boolean), and completion literal + MANDATORY STOP; coordinator owns adapter field set, parameterized `terminal_navigation`, Run-Start Step Projection, and sole scratch-cleanup trace home; runner owns Step Routing Tree (including STOP), per-dispatch plan selection, checklist execution order, report table, and appendices. Chained activation loads coordinator adapter + runner body + invocation Completion only and skips shell prereq/picker/fast-track parse.

## Alternatives Considered

- **Merge runner into coordinator** — rejected; increases blast radius and fights existing pins and install layout.
- **Move shell into a new `shell.md`** — rejected; extra card without behavior gain.
- **Keep three files with redefined normative homes** (chosen) — unambiguous surface without a file-count change.

## Consequences

- Dual equal-authority copies of STOP and scratch traces are removed as a consequence of the split.
- Behavior-preservation pins continue to target the three known card paths.
- Commit-authorization and branch auto-stay remain phase-owned on the adapter surface, not shell-normative.

## Provenance

User — `openspec/changes/chainable-apply-phase-adapter/design.md`, Decision D2.
