# supervised-design-overview-generation Specification

## Purpose
Defines how the supervised Plan (unattended) design route generates `change-overview.md`: one generation at the end of the design phase, never during the review rounds.

## Requirements

### Requirement: Supervised design seeds the unopted variant
The supervised design adapter of Explore Plan (unattended) SHALL pass `--with-overview false` on the first progress emit of every supervised design run, including a design-phase retry after a new reset and regardless of `overview_language`. The machine SHALL therefore never deliver the `overview` pointer after `validation` or `interfaces` in a supervised run. The routing SHALL stay coordinator-side and the design worker SHALL NOT touch `sai-state`. Standalone `/sai-2-design` SHALL keep seeding the variant from raw `--overview-lang` presence.

#### Scenario: Supervised run with a language seeds the unopted variant
- **WHEN** a supervised design run with a selected `overview_language` emits its first progress event carrying `prereqs-resolution` and `research`
- **THEN** the emit passes `--with-overview false` and no `overview` pointer is delivered before the Review Engine rounds

#### Scenario: Supervised retry reseeds the unopted variant
- **WHEN** a design-phase retry resets `design-standalone@1` and emits its first progress event
- **THEN** the emit passes `--with-overview false`

#### Scenario: Standalone design keeps the opt-in seed
- **WHEN** `/sai-2-design` is invoked directly with `--overview-lang spanish` and emits its first progress event
- **THEN** the emit passes `--with-overview true`

### Requirement: Supervised design generates the overview once at the final Continue
After a converged design round, an empty findings result, or design cap exhaustion, the supervised design route SHALL generate `change-overview.md` exactly once, at Explore's final `Continue`, when `overview_language` is a selected non-`None` value. The generation-trigger continuation SHALL carry the resolved change name, the generation scope marker, the worker's journal reconstruction fields, the current `overview_language`, and an explicit instruction naming `@sai/commands/design/steps/overview.md` as the step file to load, because the continuation carries no `Active step:` pointer. When `overview_language` is `None`, the final `Continue` SHALL run as a no-generation terminal and SHALL NOT write `change-overview.md` or overview state. A failed or cancelled design worker SHALL NOT trigger generation and SHALL leave the change retryable.

#### Scenario: Final Continue names the overview step file
- **WHEN** the supervised design phase reaches Explore's final `Continue` with a selected `overview_language`
- **THEN** the same worker receives one generation-trigger continuation naming `@sai/commands/design/steps/overview.md`

#### Scenario: No language means no generation
- **WHEN** the supervised design phase reaches its final `Continue` with `overview_language` `None`
- **THEN** no generation trigger is sent and no `change-overview.md` or overview state is written

#### Scenario: Failed worker generates nothing and a retry generates once
- **WHEN** a supervised design worker returns `failed` or `cancelled` before the final `Continue` and a later retry reaches its own final `Continue`
- **THEN** no overview is generated for the failed run and exactly one generation happens at the retry's final `Continue`
