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

Each full-route worker SHALL compose its ordinary closed report, including role-specific fields, and save the complete JSON or YAML through `transfer.js put` in the authorized report directory under a unique role-and-stretch filename. It SHALL return only the helper's `{path, sha256}` reference. Each completion, input request, failure, or cancellation SHALL use a new report file and retain previous reports. Backfill draft references SHALL stay inside the report and name their separate draft directory. A report-creation failure SHALL return transport-error evidence, not a substitute accepted lifecycle report.

#### Scenario: A complete report travels by reference
- **WHEN** a full-route worker completes a bounded stretch or requests input
- **THEN** it saves its unchanged complete report in a new private file and returns only its path and hash, without inserting report contents into a coordinator-authored shell command

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

For each post-ready full-route response, the coordinator SHALL pass only its reference values to the resolved validator and use the accepted parsed payload without another file read. It SHALL preserve report bytes without copying, normalizing, or silently repairing them. A missing reference or helper failure SHALL be failed delivery, not report rejection. A call returning no response SHALL establish neither acceptance nor rejection. An unaccepted report SHALL grant no lifecycle status or changed-path claim.

#### Scenario: Accepted report drives ordinary handling
- **WHEN** reference validation returns accepted
- **THEN** the coordinator consumes its parsed payload through ordinary lifecycle handling without re-reading or transcribing the report

#### Scenario: Validator call has no response
- **WHEN** the validator call is interrupted without a result
- **THEN** the coordinator records no acceptance or rejection and retains the evidence for bounded recovery

### Requirement: Full-route failed reports carry the failure fields

`sai/policies/direct-build-report-transport.md` SHALL define, in a `Failed reports` section, that a full-route `failed` report carrying `resolved_change_name` also carries `failure_class` (one of `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`, or `unclassified-worker-fault`) and a boolean `unrecoverable`. Each worker SHALL compose the ordinary closed report of its own contract with these fields. `failure_class` SHALL be worker-authored evidence, not an eligibility gate: the coordinator SHALL decide the response under `sai/policies/obstacle-escalation.md`. A worker SHALL set `unrecoverable: true` only when its own evidence shows that continuing is unsafe, and neither field SHALL be written into a repository artifact. Report delivery and validity recovery SHALL be handled as an obstacle under the same policy.

#### Scenario: A failed full-route report carries the failure fields

- **WHEN** a Direct Build, backfill, or archive worker on the full route returns `failed` after its change name resolved
- **THEN** its saved report carries `failure_class` and `unrecoverable` beside `status`, `summary`, `changed_files`, and `resolved_change_name`

#### Scenario: The failure class does not gate the response

- **WHEN** the coordinator receives a failed report with `unrecoverable: false`
- **THEN** it decides the response under `sai/policies/obstacle-escalation.md` and treats the fields as evidence only
