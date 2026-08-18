## Requirements

### Requirement: sai-1-spec stops after specs and prints a hand-off message
After generating `proposal.md` and all `specs/**/*.md` files, `sai-1-spec` SHALL stop execution and print a message directing the user to run `/sai-2-design <change-name>` when ready.

#### Scenario: sai-1-spec does not continue to design or tasks
- **WHEN** `/sai-1-spec <change-name>` is invoked
- **THEN** the command creates proposal.md and specs/ files but does NOT create design.md or tasks.md

#### Scenario: sai-1-spec prints hand-off message
- **WHEN** `/sai-1-spec <change-name>` completes
- **THEN** the final output includes a message of the form: "Specs ready in openspec/changes/{name}/. Review them and run /sai-2-design {name} when ready."

### Requirement: invoking sai-2-design is the specs approval
Invoking `/sai-2-design <change-name>` SHALL itself constitute approval of the change's specs. The command SHALL NOT ask the user to confirm that the specs were reviewed, and SHALL offer no interactive decline path at this gate. The review checkpoint lives in `sai-1-spec`'s closing feedback loop and its mandatory stop; not invoking `/sai-2-design` is the only decline.

#### Scenario: no approval question is asked
- **WHEN** `/sai-2-design <change-name>` is invoked on a change with `proposal.md` and at least one `specs/**/*.md`
- **THEN** the command asks no specs-approval question and proceeds directly to stamping the approval and generating design artifacts

### Requirement: specs approval is recorded in .openspec.yaml
Once the existence precondition passes, `sai-2-design` SHALL record the approval in the change's `.openspec.yaml` under `approval.specs`, MERGING into the existing file content and preserving all other keys verbatim. `approved_at` (ISO 8601 UTC timestamp) SHALL be written only when the key is absent or empty; `notes` SHALL be written unconditionally as an empty string.

#### Scenario: .openspec.yaml stamped on first design invocation
- **WHEN** `/sai-2-design <change-name>` runs on a change whose `.openspec.yaml` has no `approval.specs.approved_at`
- **THEN** `openspec/changes/<change-name>/.openspec.yaml` contains an `approval.specs.approved_at` field with a valid ISO 8601 timestamp and an `approval.specs.notes` field holding an empty string, with all pre-existing keys preserved

#### Scenario: existing timestamp is never overwritten
- **WHEN** `/sai-2-design <change-name>` is re-invoked on a change whose `.openspec.yaml` already has a non-empty `approval.specs.approved_at`
- **THEN** the original timestamp is left untouched and only `approval.specs.notes` is (re)written as an empty string

#### Scenario: a failed stamp is a blocking failure
- **WHEN** writing `approval.specs.*` to `.openspec.yaml` fails
- **THEN** `sai-2-design` stops with an explicit failure message naming the file and the error, and does not generate `design.md` or `tasks.md`

### Requirement: sai-2-design requires proposal and specs to exist
Before stamping the approval or generating any artifact, `sai-2-design` SHALL confirm that `openspec/changes/<change-name>/proposal.md` exists AND at least one file matching `openspec/changes/<change-name>/specs/**/*.md` exists.

#### Scenario: sai-2-design halts when the change has no specs
- **WHEN** `/sai-2-design <change-name>` is run and `proposal.md` or every `specs/**/*.md` is missing
- **THEN** the command halts and prints: "Change '<change-name>' not found or has no specs. Run /sai-1-spec to create it first."
