## ADDED Requirements

### Requirement: Artifact classification into CORE and AUDIT

The `sai-archive` command SHALL classify the nine artifacts defined by the `sai-workflow` schema into two groups:

- **CORE** (blocking): `proposal`, `specs`, `design`, `tasks`, `implementation`.
- **AUDIT** (informational only): `review`, `security`, `performance`, `accessibility`.

The classification SHALL be defined natively inside `sai/instructions/archive.md` (no CLI flags, no environment variables, no schema changes).

#### Scenario: All artifacts are present and complete

- **WHEN** the `sai-archive` command runs for a change whose nine `sai-workflow` artifacts all exist and have status `done` in `openspec status --change "<name>" --json`
- **THEN** the command MUST proceed with the archive flow without emitting a CORE-missing or AUDIT-missing diagnostic

#### Scenario: Only AUDIT artifacts are missing

- **WHEN** the `sai-archive` command runs for a change where all five CORE artifacts exist with status `done` and one or more of `review`, `security`, `performance`, `accessibility` are missing
- **THEN** the command MUST emit one informational message listing the missing AUDIT artifact names
- **THEN** the command MUST proceed with the archive flow without invoking any confirmation prompt for the missing AUDIT artifacts

#### Scenario: One or more CORE artifacts are missing

- **WHEN** the `sai-archive` command runs for a change where any of `proposal`, `specs`, `design`, `tasks`, `implementation` is missing or has status other than `done`
- **THEN** the command MUST halt immediately and print a single error message that lists every missing CORE artifact by name
- **THEN** the command MUST NOT perform the archive move and MUST NOT emit any AUDIT soft warning

### Requirement: Upstream skill is invoked only when CORE is complete

The `sai-archive` command SHALL run the classification check BEFORE invoking step 2 ("Check artifact completion status") of the upstream `openspec-archive-change` skill. When the classification determines that all CORE artifacts are present, the command SHALL either:

- suppress the upstream `AskUserQuestion` confirmation prompt for any AUDIT-only missing artifacts, OR
- skip step 2 of the upstream skill entirely and continue at step 3.

#### Scenario: Classification check runs before the upstream skill

- **WHEN** the `sai-archive` command reaches the artifact-completion phase
- **THEN** the classification logic defined in `sai/instructions/archive.md` MUST be evaluated first
- **THEN** control passes to the upstream skill only after the classification check has produced a decision (halt-on-missing-CORE OR proceed-with-AUDIT-soft-warning)

### Requirement: Incomplete-tasks soft confirmation gate

The check in `sai/instructions/archive.md` that scans `openspec/changes/{name}/implementation.md` for `- [ ]` items SHALL be a **soft confirmation gate**, not a hard stop. When one or more unchecked items are found, `sai-archive` SHALL list every unchecked item concretely — each item's location as `implementation.md:{line}`, the `#### Step N` heading it falls under, and the checkbox's own text — then prompt the user with `Continue archiving with N unchecked items? (y/n)` (where `N` is the count). The command SHALL perform the archive move ONLY on an explicit `y`. On `n`, on silence, or on any answer other than `y`, the command SHALL NOT perform the archive move and SHALL report that archiving was not performed and why.

The prompt is conversational in chat: `sai-archive` SHALL NOT write any approval key to `.openspec.yaml` and SHALL NOT introduce any new formal approval gate. This requirement governs ONLY the unchecked-items rule of the Completion Check; the CORE/AUDIT classification, the AUDIT soft-warning, the missing-main-spec handling, and the spec-sync behavior are unchanged. When `implementation.md` does not exist, this check is skipped entirely.

#### Scenario: implementation.md contains unchecked items

- **WHEN** the `sai-archive` command runs and `openspec/changes/{name}/implementation.md` exists and contains one or more `- [ ]` items
- **THEN** the command lists every unchecked item, each showing its `implementation.md:{line}` location, its enclosing `#### Step N` heading, and the checkbox text
- **AND** prompts `Continue archiving with N unchecked items? (y/n)` where `N` is the count of unchecked items
- **AND** does not perform the archive move before the user answers

#### Scenario: User confirms archiving with unchecked items

- **WHEN** the user answers `y` to the prompt
- **THEN** the command proceeds with the rest of the archive flow and performs the archive move

#### Scenario: User declines or stays silent

- **WHEN** the user answers `n`, stays silent, or gives any answer other than `y`
- **THEN** the command does NOT perform the archive move
- **AND** reports that archiving was not performed, citing the unchecked items

#### Scenario: implementation.md does not exist

- **WHEN** the `sai-archive` command runs and `openspec/changes/{name}/implementation.md` does not exist
- **THEN** the unchecked-items check is skipped entirely
- **AND** the CORE/AUDIT classification check still runs, and CORE/AUDIT behavior applies as defined elsewhere in this spec

### Requirement: No new flags, no upstream modifications, no schema modifications

The new behavior SHALL be implemented entirely inside `sai/instructions/archive.md`. The change SHALL NOT introduce any new CLI flag, environment variable, or argument to `sai-archive`. The change SHALL NOT modify the upstream `openspec-archive-change` skill files (`.claude/skills/openspec-archive-change/SKILL.md`, `.opencode/skills/openspec-archive-change/SKILL.md`). The change SHALL NOT modify the `sai-workflow` schema (`openspec/schemas/sai-workflow/schema.yaml`). The change SHALL NOT modify the `commands/{claude,opencode}/sai-archive.md` wrapper files (they only fetch and SHALL keep their current content).

#### Scenario: Diff is scoped to sai/instructions/archive.md

- **WHEN** the implementation of this change is complete
- **THEN** `git diff` against the parent commit MUST show changes only inside `sai/instructions/archive.md`
- **THEN** `git diff` MUST show no changes to `.claude/skills/openspec-archive-change/`, `.opencode/skills/openspec-archive-change/`, `openspec/schemas/sai-workflow/`, or `commands/{claude,opencode}/sai-archive.md`

#### Scenario: Non-interactive archive run with AUDIT-only gaps

- **WHEN** the `sai-archive` command runs in a non-interactive context (no `AskUserQuestion` available) for a change with all five CORE artifacts present and at least one AUDIT artifact missing
- **THEN** the command MUST emit the AUDIT soft warning to stdout
- **THEN** the command MUST perform the archive move (`mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>`)
- **THEN** the command MUST NOT halt or error

### Requirement: AUDIT soft-warning message format

When one or more AUDIT artifacts are missing, `sai-archive` MUST emit exactly one informational message before continuing. The message SHALL list each missing AUDIT artifact by its kebab-case artifact id (`review`, `security`, `performance`, `accessibility`) and SHALL indicate the message is informational, not an error.

#### Scenario: Single AUDIT artifact missing

- **WHEN** `security.md` is the only missing AUDIT artifact and all CORE artifacts are present
- **THEN** the command MUST print a single line that names `security` and labels the message as informational
- **THEN** the command MUST continue with the archive flow

#### Scenario: Multiple AUDIT artifacts missing

- **WHEN** `security.md` and `accessibility.md` are both missing and all CORE artifacts are present
- **THEN** the command MUST print a single line that lists both `security` and `accessibility`
- **THEN** the command MUST continue with the archive flow

#### Scenario: All AUDIT artifacts are present

- **WHEN** all four AUDIT artifacts (`review`, `security`, `performance`, `accessibility`) are present and all five CORE artifacts are `done`
- **THEN** the command MUST NOT emit any AUDIT-missing diagnostic
- **THEN** the archive flow MUST proceed silently

### Requirement: AUDIT artifact with "Not Applicable" justification is treated as done

When an AUDIT artifact file exists and its content includes a "Not Applicable" heading (`## Not Applicable`) followed by a justification, the `sai-archive` command MUST treat the artifact as `done` for the purposes of the soft-warning check. The justification SHALL be any non-empty prose that explains why the surface does not apply to the change. This aligns with the documented convention in `AGENTS.md` ("required; N/A justification if not applicable") and with the explicit "Not Applicable" support in the AUDIT templates of the `sai-workflow` schema.

#### Scenario: AUDIT artifact exists with "Not Applicable" justification

- **WHEN** an AUDIT artifact file (e.g. `security.md`, `performance.md`, `accessibility.md`) exists and its content includes `## Not Applicable` (or an equivalent heading) followed by a justification
- **THEN** that artifact MUST be treated as `done`
- **THEN** the command MUST NOT emit an AUDIT soft warning for it
- **THEN** the archive flow MUST proceed

#### Scenario: AUDIT artifact exists with N/A justification while others are missing

- **WHEN** `security.md` exists with a `## Not Applicable` justification, `accessibility.md` does not exist, and all five CORE artifacts are present
- **THEN** the command MUST treat `security` as `done` and MUST NOT include `security` in any AUDIT-missing diagnostic
- **THEN** the command MUST emit the AUDIT soft warning listing only `accessibility`
- **THEN** the archive flow MUST proceed
