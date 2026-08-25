# sai-backfill-input-handling Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: Wrapper MUST NOT fetch the change-picker

The routed `sai-backfill` card set (`sai/commands/backfill/coordinator.md` and `sai/commands/backfill/worker.md`) MUST NOT contain a `Fetch @sai/policies/change-picker.md` directive (nor any directive resolving to the retired `sai/instructions/change-picker.md`). Backfill stays detached from the picker: no step of its flow queries `openspec list --json` or prompts the user with a numbered change list. The legacy utility body that carried this rule is retired; the prohibition now governs both routed cards.

#### Scenario: Routed cards have no change-picker fetch

- **WHEN** the agent reads `sai/commands/backfill/coordinator.md` and `sai/commands/backfill/worker.md` after this change is applied
- **THEN** neither file contains any change-picker fetch line, and neither contains any other directive that resolves to a change-picker instruction

### Requirement: Empty-arguments resolution delegates to backfill.md

When `/sai-backfill` is invoked with an empty `$ARGUMENTS`, the boot forwards the empty envelope byte-for-byte to the routed coordinator and its dispatched worker, where resolution is handled exclusively by the STOP Conditions section of `sai/commands/backfill/instructions.md` — no additional resolution mechanism (no inline list, no re-prompt, no `openspec list` call) is introduced anywhere in the chain. The derived-name case is handled by the instruction's Change Name Confirmation phase. The envelope is a byte-for-byte pass-through to both.

#### Scenario: Empty arguments falls through to STOP Conditions

- **WHEN** the user runs `/sai-backfill` with no arguments and no name can be derived from conversation context
- **THEN** the worker returns a terminal payload whose summary is exactly `Change name required. Run: /sai-backfill <name>`, presented by the coordinator as the run's stop

#### Scenario: Non-empty arguments proceed unchanged

- **WHEN** the user runs `/sai-backfill some-kebab-name` with a kebab-case change name
- **THEN** the worker receives exactly `some-kebab-name` as `arguments_value`, uses it as the change name, and proceeds to the Change Name Confirmation phase without any picker interaction

#### Scenario: No picker side effects on the backfill path

- **WHEN** `/sai-backfill` runs (with or without arguments)
- **THEN** no surface in the chain executes `openspec list` for picker purposes, presents a numbered change list, or prompts the user with "Which change? Enter a number (1-N)"
