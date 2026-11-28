# archive-plan-tool Specification

## Purpose
TBD - created by archiving change archive-plan-computed-deterministic-tool. Update Purpose after archive.

## Requirements

### Requirement: A deterministic read-only tool SHALL compute the archive plan

`sai/tools/archive-plan.js` SHALL compute the archive plan with its `plan` subcommand, `plan <change-name> --json --cwd <root>`, accepting the optional implementer path set (`--implementer-paths-file <path>` or one `--implementer-path <path>` per path) and, on the no-specs route, `--drafts-dir <dir>`. It SHALL print one JSON object on every exit: exit 0 for a plan, exit 1 for a refusal, and exit 2 for a usage or tooling error. A plan SHALL carry the confirming `report_lines`, the CORE gate verdict and AUDIT line, the delta-sync summary, `retired_capabilities` and `retirement.declaration` (`none`, `write`, or `present`), the date-prefixed `archive_destination`, `affected_main_specs`, `owned_staging_paths`, `already_staged_deletions`, `omitted_ignored_paths`, `omitted_absent_paths`, `covering_paths`, `commit_body_lines`, `closing_line`, and `plan_fingerprint`. The `plan` subcommand SHALL spawn only `git` and `check-delta-headers.js` and SHALL write nothing; the `footer` subcommand is governed by the footer requirement below. It SHALL be installed by the existing `sai-tools` projection for Claude Code and opencode.

#### Scenario: The plan matches the archive and git

- **WHEN** the tool plans a normal archive and `openspec archive <name> --yes --json` then runs
- **THEN** the plan's destination, affected main specs, commit paths, and omitted ignored paths equal what the CLI and git produce afterwards

#### Scenario: Planning writes nothing

- **WHEN** the tool computes a plan or a refusal
- **THEN** the working tree, the index, and the ignored files are unchanged

#### Scenario: A usage error exits 2

- **WHEN** the tool is invoked without a change name or with an unknown option
- **THEN** it prints one JSON object and exits 2

### Requirement: A refusal SHALL stop the archive before any write

When the plan cannot be executed safely, the tool SHALL return a refusal (`ok: false`, `refused: true`) with a `reason` and a `summary` to print verbatim, and nothing SHALL be written and no archive SHALL run. A missing CORE artifact on a change that is not backfilled SHALL be refused with reason `core-missing` and the summary exactly `Missing CORE artifact(s): <ids>. Archive blocked.`; changes that declare `backfilled` or `skip_specs` SHALL keep their current CORE rules. An existing destination `openspec/changes/archive/YYYY-MM-DD-<name>/` SHALL be refused with reason `collision`. A MODIFIED requirement that drops an existing scenario SHALL be refused with reason `scenario-dropped`. A refusal SHALL be a planned stop, never a question and never an obstacle.

#### Scenario: A missing CORE artifact keeps its exact literal

- **WHEN** a CORE artifact of a change that is not backfilled is missing
- **THEN** the tool refuses with `Missing CORE artifact(s): <ids>. Archive blocked.` and exits 1

#### Scenario: A collision is refused before any execute order

- **WHEN** the date-prefixed archive destination already exists
- **THEN** the tool refuses with reason `collision` before any execute order and nothing is written

#### Scenario: A dropped scenario is refused before the CLI

- **WHEN** a MODIFIED requirement of a delta drops a scenario of the published requirement
- **THEN** the tool refuses with reason `scenario-dropped` and the CLI archive does not run

### Requirement: The plan SHALL decide the retirement declaration and its refusals

When a delta empties a capability, the plan SHALL list it in `retired_capabilities` and SHALL set `retirement.declaration` to `write` when `retire_capabilities` is absent and to `present` when it already parses as `true`. The tool SHALL refuse with `retire-veto` when the parsed value is `false`, with `retire-unhonoured` when it is not a boolean (for example the string `"yes"`, even when `openspec status` errors on that value), with `retire-unaccounted-content` when an emptied capability's published spec carries unaccounted content, and with `retire-metadata` when `.openspec.yaml` is missing or has no `schema:` key.

#### Scenario: An emptied capability without the key marks the declaration

- **WHEN** a delta empties a capability and `.openspec.yaml` has no `retire_capabilities` key
- **THEN** the plan lists the capability as retired and sets `retirement.declaration` to `write`

#### Scenario: A non-boolean value is refused

- **WHEN** `retire_capabilities` holds the string `"yes"`
- **THEN** the tool refuses with reason `retire-unhonoured` and names the value

### Requirement: The tool SHALL read metadata without guessing and without a new dependency

The tool SHALL read `.openspec.yaml` with a minimal flat-key parser and SHALL add no YAML dependency. A `.openspec.yaml` whose shape the parser does not recognize SHALL be refused with reason `metadata-unreadable` and a read reason, whatever the delta holds; the tool SHALL NOT guess a value.

#### Scenario: Unreadable metadata is refused

- **WHEN** `.openspec.yaml` holds a shape the flat-key parser does not recognize
- **THEN** the tool refuses with reason `metadata-unreadable` and plans nothing

### Requirement: The owned staging paths SHALL handle staged deletions and no-specs drafts

`owned_staging_paths` SHALL be the exact staging allowlist of the archive commit: the archived copies of the change files, the originals the move removes from the index, the main specs the archive writes, creates, or deletes, and the implementer path set when given. An implementer path whose deletion is already staged SHALL be listed in `already_staged_deletions`, SHALL NOT be added again, and SHALL remain in the commit. Ignored untracked paths SHALL be listed in `omitted_ignored_paths` and left out. On the no-specs route with `--drafts-dir`, the tool SHALL read the draft `.openspec.yaml` and `proposal.md` in place of the missing change files, and the commit paths SHALL be the archived copies, never the pre-move draft destinations.

#### Scenario: An already staged deletion is not added again

- **WHEN** the implementer path set holds a path whose deletion is already staged
- **THEN** the plan lists it in `already_staged_deletions`, staging does not add it again, and the commit records the deletion

#### Scenario: No-specs drafts commit as archived copies

- **WHEN** the tool plans a no-specs route with a drafts directory
- **THEN** the commit paths name the archived copies, including `proposal.md`, omit ignored files, and do not name the pre-move draft destinations

### Requirement: The fixed lines of the archive commit message SHALL come from the tool

The plan's `commit_body_lines` SHALL hold one `Retired capability: <id>` line per retired capability, and its `closing_line` SHALL be `Closes owner/repo#N` for a verified origin derived from the shape of the origin URL with no API call, or empty. A model SHALL only author the commit message, at execute time, from the staged diff, and SHALL add those lines unchanged and no closing line of its own.

#### Scenario: The closing line comes from the origin URL

- **WHEN** the change's `backlog_origin` is a GitHub issue URL
- **THEN** the plan's `closing_line` is `Closes owner/repo#N` for that issue

### Requirement: The plan fingerprint SHALL bind every decision to the plan it rests on

The plan SHALL carry `plan_fingerprint`, a digest of its fields. Right before an execute order, the coordinator SHALL compute the plan again with the same inputs; a plan whose fingerprint changed (for example, midnight passed and the destination date changed) SHALL be the plan the order is built from.

#### Scenario: A date change rebuilds the order

- **WHEN** the plan computed right before the order differs from the plan read earlier
- **THEN** the order is built from the new plan and carries its `plan_fingerprint`

### Requirement: A CLI failure after a clean plan SHALL be reported as is

When `openspec archive` fails after a plan that was not refused, for a validation the tool does not predict such as a requirement without SHALL, the CLI error SHALL be reported verbatim and no commit SHALL be made.

#### Scenario: An unpredicted validation fails the CLI

- **WHEN** the CLI archive fails on a delta that the tool planned cleanly
- **THEN** the run reports the CLI error as is and creates no commit

### Requirement: Fixture tests SHALL compare the plan with the real archive

`test/archive-plan.test.js` SHALL run each fixture against the real `openspec archive` in a temporary directory and compare the plan with the result, and SHALL skip those fixtures when the `openspec` binary is absent.

#### Scenario: The openspec binary is absent

- **WHEN** the test suite runs on a machine without the `openspec` binary
- **THEN** the fixtures that run `openspec archive` are skipped

### Requirement: The footer subcommand SHALL judge the archive commit's closing footer

`sai/tools/archive-plan.js footer --commit <rev> --closing-line <line> --output <path> [--json] [--cwd <root>]` SHALL read the message of `<rev>` (default `HEAD`) without changing the commit and SHALL report `present`, `missing`, `moved`, or `additional`; `additional` means the message also carries another `Closes` line. When the plan's line is not the last non-empty line, it SHALL write the complete corrected message to `--output`. It SHALL change no commit and SHALL exit 2 on a usage or tooling error.

#### Scenario: A present footer is left unchanged

- **WHEN** the plan's closing line already is the last non-empty line of the commit message
- **THEN** the verdict is `present` and no corrected message is written

#### Scenario: A missing footer is appended last

- **WHEN** the message carries no closing line and no other `Closes` line
- **THEN** the verdict is `missing` and the corrected message keeps every line and appends the plan's line last after a blank separator

#### Scenario: A moved footer is moved to the end

- **WHEN** the plan's line appears earlier in the message but not last
- **THEN** the verdict is `moved` and the corrected message keeps every other line and carries the plan's line once, last

#### Scenario: An additional closing line is kept above the plan's line

- **WHEN** the message also carries a `Closes` line for another issue, bare or differently cased
- **THEN** the verdict is `additional`, that line is kept as written, and the plan's line is last

#### Scenario: A missing closing line is a usage error

- **WHEN** the subcommand is invoked without `--closing-line`
- **THEN** it prints one JSON object and exits 2
