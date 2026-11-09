# direct-build-report-transport Specification

## Purpose
Deliver full Direct Build worker reports through private file references and validate the exact verified bytes without coordinator transcription.

## Requirements

### Requirement: Full Direct Build reports use private references

For the full Direct Build - Unattended route in Claude Code and opencode, the coordinator SHALL create a private report directory with `transfer.js open --harness <claude|opencode>` and disclose it to the implementation, backfill, and archive workers through an outermost `--report-dir <absolute path>` line after ready. Workers SHALL strip that line before parsing their ordinary input and retain the directory across same-worker continuations. A full-route task lacking the directory SHALL report missing transport without work. The initial ready return, `--no-specs` POC, and standalone backfill and archive report transport SHALL remain unchanged.

#### Scenario: Report storage is disclosed after ready
- **WHEN** the coordinator discloses a full Direct Build task after the initial ready exchange
- **THEN** it supplies the private report directory as the outermost line, ahead of any backfill transfer-directory line, and the worker retains it outside its invocation envelope

#### Scenario: Full route has no report directory
- **WHEN** a full Direct Build task lacks its required report directory
- **THEN** the worker reports the missing transport without performing task work

#### Scenario: Existing routes retain their transport
- **WHEN** a worker returns initial readiness or operates in POC or standalone backfill or archive mode
- **THEN** the existing transport applies without this full-route migration

### Requirement: Workers preserve complete reports without inline copying

Each full-route worker SHALL compose its ordinary closed report, including role-specific fields, and save the complete JSON or YAML through `transfer.js put` in the authorized report directory under a unique role-and-stretch filename. It SHALL return only the helper's `{path, sha256}` reference plus the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it, never inside the saved file. Each completion, input request, failure, or cancellation SHALL use a new report file and retain previous reports. Backfill draft references SHALL stay inside the report and name their separate draft directory. A report-creation failure SHALL return transport-error evidence, not a substitute accepted lifecycle report.

#### Scenario: A complete report travels by reference
- **WHEN** a full-route worker completes a bounded stretch or requests input
- **THEN** it saves its unchanged complete report in a new private file and returns only its path and hash with the warming line beside them, without inserting report contents into a coordinator-authored shell command

#### Scenario: Backfill reports contain separate draft references
- **WHEN** a backfill prepare report carries draft and scenario-exception references
- **THEN** those references remain nested in the complete private report and their files remain separate from report storage

#### Scenario: Report creation fails
- **WHEN** the transfer helper cannot save a report
- **THEN** the worker returns the transport error as evidence without an inline lifecycle-report fallback

### Requirement: Validator verifies and validates a single report read

`worker-report-validator.js` SHALL provide `validateFile(dir, reference, kind, options)` and CLI file mode using `--report-dir`, `--report-file`, and `--report-hash` together. File mode SHALL not read stdin. It SHALL use the transfer helper to verify authorized location, safe file identity, and hash and SHALL validate the same byte buffer from one read, without a later report-file read. CLI responses SHALL retain first-key `received_at`. Only successful validation SHALL return `outcome: accepted` with the parsed `payload`; an unverified reference SHALL return `delivery-failed`, and verified but unsupported or malformed report content SHALL return `report-invalid`. Original report bytes SHALL remain unchanged.

#### Scenario: Valid report is read once
- **WHEN** a private reference verifies and contains a valid report
- **THEN** file mode validates the same one-read buffer and returns accepted with the parsed payload, ignoring stdin even if the file changes after that read

#### Scenario: Reference cannot be delivered safely
- **WHEN** a report is missing, unreadable, foreign, symbolic-linked, or does not match its hash
- **THEN** the outcome is delivery-failed without an accepted payload

#### Scenario: Verified content is unsupported or invalid
- **WHEN** verified bytes contain invalid UTF-8, unsupported raw control characters, or a malformed report
- **THEN** the outcome is report-invalid without an accepted payload or silent correction, and the evidence remains byte-identical

#### Scenario: Partial reference arguments do not fall back
- **WHEN** only some of the three file-mode flags are supplied
- **THEN** the CLI exits 2 with a usage error instead of reading stdin

#### Scenario: Supported content remains faithful
- **WHEN** JSON or YAML contains quotes, shell-like text, non-ASCII content, CRLF, or nested draft references
- **THEN** accepted payload values preserve that content while the stored report bytes remain unchanged

### Requirement: Receiver consumes only accepted verified payloads

For each post-ready response that travels as a report reference, the coordinator SHALL pass only its reference values to the resolved validator as `validate --kind terminal --command <command> --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>`, where `<command>` names the command whose outcome values the report may carry (`implement` for RED and GREEN; `direct-build`, `backfill`, or `archive` for the Direct Build worker of that role), and use the accepted parsed payload without another file read. It SHALL preserve report bytes without copying, normalizing, or silently repairing them. A missing reference or helper failure SHALL be failed delivery, not report rejection. A call returning no response SHALL establish neither acceptance nor rejection. An unaccepted report SHALL grant no lifecycle status or changed-path claim.

#### Scenario: Accepted report drives ordinary handling
- **WHEN** reference validation returns accepted
- **THEN** the coordinator consumes its parsed payload through ordinary lifecycle handling without re-reading or transcribing the report

#### Scenario: Validator call has no response
- **WHEN** the validator call is interrupted without a result
- **THEN** the coordinator records no acceptance or rejection and retains the evidence for bounded recovery

### Requirement: Full-route failed reports carry the failure fields

`sai/policies/worker-report-transport.md` SHALL define, in a `Direct Build role fields` section, that a full-route `failed` report carrying `resolved_change_name` also carries `failure_class` (one of `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`, or `unclassified-worker-fault`) and a boolean `unrecoverable`, as role fields of Direct Build that no other worker carries. Each Direct Build worker SHALL compose the report of its own contract with these fields. `failure_class` SHALL be worker-authored evidence, not an eligibility gate: the coordinator SHALL decide the response under `sai/policies/obstacle-escalation.md`. A worker SHALL set `unrecoverable: true` only when its own evidence shows that continuing is unsafe, and neither field SHALL be written into a repository artifact. Report delivery and validity recovery SHALL be handled as an obstacle under the same policy.

#### Scenario: A failed full-route report carries the failure fields

- **WHEN** a Direct Build, backfill, or archive worker on the full route returns `failed` after its change name resolved
- **THEN** its saved report carries `failure_class` and `unrecoverable` beside `status`, `summary`, `changed_files`, and `resolved_change_name`

#### Scenario: The failure class does not gate the response

- **WHEN** the coordinator receives a failed report with `unrecoverable: false`
- **THEN** it decides the response under `sai/policies/obstacle-escalation.md` and treats the fields as evidence only

### Requirement: One shared worker report policy

`sai/policies/worker-report-transport.md` SHALL be the single source for how a routed worker returns its result and how its coordinator receives it, for the workers whose contract fetches it: the RED and GREEN workers of `/sai-3-implement`, the spec and design workers of the plan commands, the review worker of `/sai-4-review`, and the implementation, backfill, and archive workers of the full Direct Build - Unattended route. The policy SHALL name the role fields of each family (spec and design: `step_ids`, `warnings`, and `notes`; review: `review_path`, `counts`, and `recommended_audits`), and the run state that keeps the report directory (`plan-run@1` for the plan commands, the conversation for `/sai-4-review`). `sai/policies/direct-build-report-transport.md` SHALL be retired: `sai/install-manifest.json` SHALL declare it a retired path for Claude Code and opencode, and `sai/policies/tool-resolution.md` and the worker and coordinator contracts SHALL point at the shared policy. A worker family whose contract does not fetch the policy SHALL keep its present report dialect. Claude Code and opencode SHALL produce, validate, and recover reports identically.

#### Scenario: The retired policy leaves the installation

- **WHEN** install or project refresh runs on Claude Code or opencode
- **THEN** the installed `sai/policies/direct-build-report-transport.md` copy is deleted as a manifest-declared retired path

#### Scenario: A worker family outside the slice keeps its dialect

- **WHEN** a worker whose contract does not fetch `worker-report-transport.md`, such as an audit, commit, archive, backfill, or merge worker outside the full Direct Build route, returns a result
- **THEN** its coordinator receives it in that family's present report form

#### Scenario: The plan and review workers follow the policy

- **WHEN** the spec, design, or review worker returns a result
- **THEN** it returns a report reference that its coordinator validates with `--command spec`, `--command design`, or `--command review` before reading any field

### Requirement: Reports follow one closed schema

A report SHALL be YAML or JSON closed to a `status` of `completed`, `failed`, or `cancelled` with `summary` and `changed_files`, or a `status` of `needs_input` that also carries `question` and `options` (`{label, value}` items). A `completed` report MAY carry an `outcome`, restricted to the values the validator admits for the named command. A worker contract MAY add its own role fields, and a role field SHALL NOT replace a schema field. A step that cannot finish SHALL report `failed` with its reason. A report using the retired `done`, `blocked`, `step-done`, `question`, `notice`, or `conflict_detected` vocabularies, and a worker message that carries its result inline instead of as a report reference, SHALL be an invalid report. Messages outside the schema SHALL keep their form: the `event: ready` handshake reply, the wake `ok`, the `warming:` line beside the reference, and every `budget-*` helper result.

#### Scenario: A retired status is invalid

- **WHEN** a worker saves a report with `status: blocked`
- **THEN** the validator rejects it as `report-invalid` and the coordinator does not act on any of its fields

#### Scenario: An inline result is invalid

- **WHEN** a worker returns its result inline instead of a `{path, sha256}` reference
- **THEN** the coordinator treats the message as an invalid report

### Requirement: The coordinator validates every report before reading it

The coordinator SHALL validate every report with `worker-report-validator.js` before it reads any field. When the validator cannot be resolved per `sai/policies/tool-resolution.md`, the run SHALL stop on that obstacle and the coordinator SHALL NOT interpret the report by reading it.

#### Scenario: The validator cannot be resolved

- **WHEN** no `worker-report-validator.js` candidate exists for a report that arrived
- **THEN** the run stops on that obstacle without reading the report file

### Requirement: Invalid reports reuse the obstacle budget

An invalid report SHALL be an obstacle of the step under `sai/policies/obstacle-escalation.md`, with its budget of 3 attempts and no new budget. The first invalid report SHALL go back to the same worker with the validator's errors, as a request for a corrected report that performs no work again; a second consecutive invalid report from that worker SHALL replace it with a coordinator-written hand-over. Each SHALL count as one attempt, and the exhausted budget SHALL escalate as that policy says.

#### Scenario: Two consecutive invalid reports

- **WHEN** a worker's report is invalid and its corrected report is invalid again
- **THEN** the coordinator first returns the validator's errors to the same worker, then replaces it, spending one obstacle attempt each time

### Requirement: Progress reports carry completed plan steps

`sai/policies/worker-report-transport.md` SHALL define a progress report: YAML with exactly `event: progress`, `step_ids` (the plan ids the message completed, in plan order), and `changed_files`, never a terminal result. A worker SHALL save a progress report like any other report, in a file whose name starts with `progress-`. The coordinator SHALL read the kind from the file name, never from the content: a `progress-` file SHALL be validated with `validate --kind progress`, which takes no `--command`, and any other report with `validate --kind terminal`. A report whose content does not fit the kind its name announces SHALL be invalid. An accepted progress report SHALL advance the worker's step machine through `sai-state emit <id> <machine> --progress --input-file <report file>` with the same report file.

#### Scenario: A terminal shape in a progress file is invalid

- **WHEN** a file named `progress-1.yaml` carries a terminal `status`
- **THEN** validation with `--kind progress` rejects it and the coordinator reads no field of it
