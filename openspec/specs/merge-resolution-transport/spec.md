# merge-resolution-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-merge. Update Purpose after archive.

## Requirements

### Requirement: Merge invocation owns one transfer directory

The `/sai-merge` coordinator SHALL resolve `transfer.js` per the shared tool-resolution policy and, at invocation start and before the first stage, SHALL run `transfer.js open --harness <claude|opencode>` for the active harness and keep the returned directory as invocation-scoped state. An `open` exit 2 SHALL stop the invocation with the verbatim error, no dispatch, and no write. The coordinator SHALL run `transfer.js close --dir <dir>` when the invocation closes, whether it completed, failed, or was cancelled, before handing the final summary or stop report to terminal navigation, and the directory SHALL remain available until then, including through every replacement and review correction. Claude Code and opencode SHALL follow the same contract.

#### Scenario: Missing temp root blocks the run

- **WHEN** `transfer.js open` exits 2 at invocation start
- **THEN** the coordinator reports the verbatim error and stops with no worker dispatch and no write

#### Scenario: Directory closes on every terminal outcome

- **WHEN** the merge invocation completes, fails, or is cancelled
- **THEN** the coordinator runs `transfer.js close` on its transfer directory before terminal navigation

### Requirement: Transfer directory is disclosed only at task disclosure

The coordinator SHALL deliver the transfer directory only in the task-disclosure continuation, as one outermost first line `--transfer-dir <absolute path>` ahead of the `Active stage:` pointer of the worker's first task and of every replacement's first task, and SHALL NOT place it in the dispatch envelope or in `arguments_value`. The merge worker SHALL strip that line before any other parse and retain the path as invocation-scoped state across ordinary continuations. A worker that reaches the `apply` stage without the line SHALL return `failed` with no write and a summary naming the missing line, and SHALL NOT fall back to returning the resolution inline.

#### Scenario: Ready dispatch carries no transfer directory

- **WHEN** the coordinator dispatches the merge worker for the ready handshake
- **THEN** the envelope carries no `--transfer-dir` line and the first task disclosure opens with it

#### Scenario: Apply without a transfer directory fails

- **WHEN** the worker reaches `apply` and no `--transfer-dir` line was disclosed
- **THEN** it returns `failed` naming the missing line and writes nothing

### Requirement: Worker hands over the complete resolution result as a reference

After the Step 7 application hand-off and its `merge.js write` placements, the merge worker SHALL write its complete original result — its envelope, its `summary` with the `## Complete resolution payload` section, and its `changed_files` — to a transfer file with `transfer.js put` in the disclosed transfer directory, using a fresh relative path for each result (`resolution-1.json`, `resolution-2.json`, ...), and through no other tool. It SHALL then return the terminal `completed` payload whose `summary` holds only the application-outcome text, with no payload section and no region text, plus exactly one `resolution_reference` `{path, sha256}` as printed by `put`; merge references carry no destination. When the helper is unavailable or denied, the worker SHALL return `failed` naming the blocked operation and SHALL NOT return the payload inline. Transfer files SHALL NOT enter `changed_files`.

#### Scenario: Completed result returns outcome plus reference

- **WHEN** the worker finishes applying a confirmed strategy
- **THEN** its `completed` payload carries the application-outcome `summary` and one `resolution_reference`, and the complete result exists only in the transfer file

#### Scenario: Corrected result uses a new transfer file

- **WHEN** the worker returns a corrected result after a coordinator-authorized correction or a rejected payload
- **THEN** it writes the result to a new transfer file and returns its new reference, which supersedes every earlier one

#### Scenario: Denied helper never falls back inline

- **WHEN** `transfer.js put` is unavailable or its invocation is denied
- **THEN** the worker returns `failed` naming the blocked operation and no inline payload

### Requirement: Coordinator verifies and validates the transfer file without reading it

Before validation the coordinator SHALL run `transfer.js verify --dir <dir> --path <path> --sha256 <sha256>` on the returned reference. A verify exit 1 or exit 2 SHALL stage nothing and SHALL continue the same worker with the verbatim helper report, requiring a corrected result with a new reference rather than an inline payload; a worker that reports the helper unavailable or denied SHALL end the stage with nothing staged. The coordinator SHALL then validate the complete original result by piping the transfer file to the shared `worker-report-validator.js`, SHALL pass the same verified path unchanged as `--source` to `merge.js resolution`, and SHALL NOT read the transfer file into its context, copy it, or reconstruct, summarize, or strip its content. The inline `summary` SHALL be a presentation view only, and no consistency check SHALL compare it with the transfer file. The reference's `path` and `sha256` SHALL be the only retained record of the result until the invocation closes, and a corrected result SHALL supersede them. The `--confirmed` input, strategy confirmations, and every `merge.js resolution` check SHALL remain unchanged.

#### Scenario: Unverifiable reference stages nothing

- **WHEN** `verify` reports a missing file, a sha256 mismatch, a path outside the directory, or a symbolic-link component
- **THEN** the coordinator stages nothing and continues the same worker for a corrected result with a new reference

#### Scenario: Transfer file is the validation source

- **WHEN** a reference verifies
- **THEN** the coordinator pipes the transfer file to the shared validator and passes its path as `--source` to `merge.js resolution` without reading its content

### Requirement: Merge reconstruction carries references, never resolution content

The coordinator's replacement reconstruction fields SHALL include the transfer directory path and the latest `resolution_reference`, and SHALL NOT include resolution content. No continuation or reconstruction SHALL receive, send, or reconstruct the complete resolution content, and strategy confirmations SHALL remain separate coordinator evidence outside the transfer.

#### Scenario: Replacement receives the reference only

- **WHEN** the merge worker is replaced after a resolution result was returned
- **THEN** the replacement receives the transfer directory path and the latest reference, and no resolution content
