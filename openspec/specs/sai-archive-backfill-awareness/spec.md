## ADDED Requirements

### Requirement: Classification Check MUST consult .openspec.yaml

`sai/instructions/archive.md` Classification Check MUST read `openspec/changes/$ARGUMENTS/.openspec.yaml` and look up the `backfilled` field. The lookup MUST happen after step 1 (status JSON parse) and before step 3 (CORE artifact evaluation), so the exemption can short-circuit the missing-CORE check.

#### Scenario: Lookup precedes CORE evaluation

    - **WHEN** the agent executes the Classification Check
    - **THEN** the agent MUST read `.openspec.yaml` and extract the `backfilled` value BEFORE evaluating CORE artifact statuses, and MUST log the resolved value as part of the check's intermediate state

### Requirement: Backfilled changes are exempt from design/tasks/implementation

When `backfilled: true` is read from `.openspec.yaml`, the Classification Check MUST treat `design`, `tasks`, and `implementation` as satisfied for that change, even when their `status` is not `done`. All other CORE and AUDIT evaluation MUST be unchanged.

#### Scenario: All three CORE artifacts exempted

    - **WHEN** `.openspec.yaml` declares `backfilled: true` AND the status JSON shows `design`, `tasks`, and `implementation` are all not `done`
    - **THEN** the Classification Check MUST NOT block on any of the three, MUST NOT include them in a "Missing CORE artifact(s)" error message, and MUST proceed to the AUDIT step (step 4) and the upstream skill step (step 5) as if all three were `done`

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

### Requirement: Corrupt .openspec.yaml falls back to non-backfilled

When `openspec/changes/$ARGUMENTS/.openspec.yaml` exists but cannot be parsed as YAML, the Classification Check MUST treat `backfilled` as `false` and emit a single warning line. The archive MUST NOT abort; CORE and AUDIT evaluation MUST proceed as if `.openspec.yaml` were absent.

#### Scenario: Corrupt metadata file

- **WHEN** `.openspec.yaml` exists and is not valid YAML
- **THEN** the Classification Check prints a warning line and treats `backfilled` as `false`; no exemption is applied to CORE

### Requirement: AUDIT behavior is unchanged

The Classification Check MUST NOT modify its AUDIT step for backfilled changes. Missing `review`/`security`/`performance`/`accessibility` artifacts MUST still be evaluated by the same rules (file existence + `## Not Applicable` heading) and the same informational line MUST be printed when AUDIT artifacts are missing.

#### Scenario: AUDIT informational line still emitted

    - **WHEN** `.openspec.yaml` declares `backfilled: true` AND one or more AUDIT artifacts are missing (and not present via `## Not Applicable`)
    - **THEN** the Classification Check MUST still print exactly one `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>` line
