# sai-archive-backfill-awareness Specification

## Purpose

Makes the archive Classification Check consult `.openspec.yaml`, so a backfilled change is exempt from the design and tasks artifacts while other changes are unaffected.

## Requirements

### Requirement: Classification Check MUST consult .openspec.yaml

The archive plan tool `sai/tools/archive-plan.js` MUST read `openspec/changes/<name>/.openspec.yaml` itself, with its flat-key parser and no status-JSON step, and look up the `backfilled` field. The lookup MUST happen before the CORE artifact evaluation, so the exemption can short-circuit the missing-CORE check, and the plan MUST report the resolved value in its `report_lines`. `sai/commands/archive/instructions.md` describes the plan that carries the check.

#### Scenario: Lookup precedes CORE evaluation

- **WHEN** the plan tool executes the Classification Check
- **THEN** the tool MUST read `.openspec.yaml` and extract the `backfilled` value BEFORE evaluating CORE artifact statuses, and MUST report the resolved value as a line of the plan's report

### Requirement: Backfilled changes are exempt from design/tasks/implementation

When `backfilled: true` is read from `.openspec.yaml`, the Classification Check MUST treat `design`, `tasks`, and `implementation` as satisfied for that change, even when their `status` is not `done`. All other CORE and AUDIT evaluation MUST be unchanged.

#### Scenario: All three CORE artifacts exempted

    - **WHEN** `.openspec.yaml` declares `backfilled: true` AND the status JSON shows `design`, `tasks`, and `implementation` are all not `done`
    - **THEN** the Classification Check MUST NOT block on any of the three, MUST NOT include them in a "Missing CORE artifact(s)" error message, and MUST proceed to the AUDIT evaluation and the rest of the archive flow as if all three were `done`

#### Scenario: proposal and specs remain required

    - **WHEN** `.openspec.yaml` declares `backfilled: true` AND the status JSON shows `proposal` or `specs` is not `done`
    - **THEN** the Classification Check MUST still block and report the missing CORE artifact(s) as before; the backfill exemption MUST NOT extend to `proposal` or `specs`

### Requirement: Non-backfilled changes are unaffected

When `.openspec.yaml` does not exist, does not contain `backfilled`, or contains `backfilled: false`, the Classification Check MUST behave exactly as it did before this change. No exemption MUST be applied.

#### Scenario: Missing .openspec.yaml

    - **WHEN** `openspec/changes/$ARGUMENTS/.openspec.yaml` does not exist
    - **THEN** the Classification Check MUST proceed as if the backfill exemption does not exist, and MUST block on any missing CORE artifact

#### Scenario: backfilled: false

    - **WHEN** `.openspec.yaml` exists and contains `backfilled: false`
    - **THEN** the Classification Check MUST NOT apply the exemption and MUST block on missing `design`/`tasks`/`implementation` per the existing rules

### Requirement: AUDIT behavior is unchanged

The Classification Check MUST NOT modify its AUDIT step for backfilled changes. Missing `review`/`security`/`performance`/`accessibility` artifacts MUST still be evaluated by the same rules (file existence + `## Not Applicable` heading) and the same informational line MUST be printed when AUDIT artifacts are missing.

#### Scenario: AUDIT informational line still emitted

    - **WHEN** `.openspec.yaml` declares `backfilled: true` AND one or more AUDIT artifacts are missing (and not present via `## Not Applicable`)
    - **THEN** the Classification Check MUST still print exactly one `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>` line

### Requirement: An unreadable .openspec.yaml refuses the archive plan

When `openspec/changes/<name>/.openspec.yaml` exists but its shape cannot be read by the archive plan tool's flat-key parser, the tool MUST refuse the plan with reason `metadata-unreadable` and a read reason, and MUST NOT guess the value of `backfilled`. No archive, write, or commit SHALL follow the refusal.

#### Scenario: Unreadable metadata refuses the plan

- **WHEN** `.openspec.yaml` exists and its shape cannot be read by the flat-key parser
- **THEN** the plan tool refuses with reason `metadata-unreadable`, names the read reason, and the archive does not run
