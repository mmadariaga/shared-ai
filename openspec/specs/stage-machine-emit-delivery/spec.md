# stage-machine-emit-delivery Specification

## Purpose
TBD - created by archiving change sai-state-emit-via-stdin. Update Purpose after archive.

## Requirements

### Requirement: Single canonical emit invocation form
`sai/policies/stage-machine.md` SHALL document the flag form as the default delivery of an identifier event, one whose values are all identifiers or paths with no free text: `node <tool-path> emit <id> <machineId> --set <field>=<id> [--add <field>=<id> ...] [--set-path <field>="<path>"]`, used by its canonical example. It SHALL state the flag rules: `--set` sets one value, repeatable `--add` appends to a list and `--add <field>=` records an empty list, `--set-path` sets a path; a field name starts with a letter followed by letters, digits, or `_`; a `--set` or `--add` value matches the `ID_PATTERN` of `sai-state/machines/run-core.js`; a `--set-path` value holds no `"`, `$`, backtick, or control character; and a violation, a field named twice, or a flag combined with another event source is a usage error (exit 2) that changes no state, a rejected path naming `--input-file` as the alternative. It SHALL document the input form, `node <tool-path> emit <id> <machineId> --input-file <path>`, for an event that holds free text or a path the flags reject, where `<path>` names a unique file that the caller wrote with the harness-native file-write tool inside a directory returned by `transfer.js open --harness <claude|opencode>`, holding the event JSON. It SHALL document only two other emit forms. The first SHALL be the step-machine progress emit, which carries a worker progress payload rather than event JSON, in its reference form `node <tool-path> emit <id> <machineId> --progress --report-dir <dir> --report-file <path> --report-hash <sha256>` (the worker's progress report reference, verified and validated by the emit) and its input form `node <tool-path> emit <id> <machineId> --progress --input-file <path>`. The second SHALL be the explore block emit, `node <tool-path> emit <id> explore-slice@1 --ready-to-propose --block-file <path> --verdicts-file <path>`, which carries a `Ready to Propose` block set in a block file and its verdicts in a verdicts file rather than event JSON. The policy SHALL state that the flag form and the input form are identical in Bash and PowerShell 7 on both Claude Code and opencode. Windows PowerShell 5.1 SHALL be outside the supported-shell contract. The policy SHALL NOT document `Legacy` argument passing, escaped doubles, an argv JSON event form, a stdin pipe, or a heredoc as the prescribed delivery; it SHALL state that `--input-file` wins over stdin and that the `-` stdin form stays accepted only so instructions installed before the input file keep working. The policy SHALL state that the store strips a leading BOM and surrounding whitespace or line breaks from an event. The `sai-state` CLI entries of `sai/policies/stage-machine.md` SHALL state that `emit` builds an identifier event from the flags or reads its JSON from the input file, that the input form of the progress emit reads its JSON from the input file, that the reference form of the progress emit reads the verified report file, that the stdin `-` form stays accepted, and that a missing, unreadable, or empty input file exits 2 naming the path and changes no state. The `bin/sai-state.js` bullet of `sai/policies/tool-resolution.md` SHALL name the flag form for identifier events and `--input-file <path>` for free text or a rejected path. Every coordinator card and explore step that emits an identifier event, including `sai/commands/implement/coordinator.md`, `sai/commands/plan/cycle.md`, and `sai/commands/merge/coordinator.md`, SHALL prescribe the flag form.

#### Scenario: Reader emits from any supported shell
- **WHEN** a reader follows the canonical example in Bash or PowerShell 7
- **THEN** they run the same `node <tool-path> emit <id> <machineId> --set <field>=<id>` line with no input file, no quoting beyond a double-quoted `--set-path` value, no escaping, and no `Legacy` setting

#### Scenario: Permission policy names the stdin form
- **WHEN** a reader consults the `sai-state` CLI entries of `sai/policies/stage-machine.md`
- **THEN** the emit entries name the flag form and the `--input-file <path>` form and state that the stdin `-` form stays accepted

#### Scenario: Free-text event keeps the input file
- **WHEN** an event holds free text or a path that `--set-path` rejects
- **THEN** the reader writes the event JSON to a unique input file with the native file-write tool and runs the emit line with `--input-file <path>` in place of the flags

#### Scenario: Coordinator cards emit run events as flags
- **WHEN** a reader follows the run-state emit instructions of the implement coordinator, the plan cycle, or the merge coordinator
- **THEN** each event is sent as `--set kind=<event>` with its fields as `--set`, `--add`, or `--set-path` flags, and the plan cycle sends accepted step ids with one `--add step_ids=<id>` per id

### Requirement: Bounded corrective retry for delivery failures
The stage-machine policy SHALL let a caller retry an emit without asking the user when the emit answers `reason: "EVENT_UNPARSEABLE"`, `reason: "BLOCK_COMPOSITION_FAILED"`, or an `emit` usage error (exit 2), up to 2 times. Each retry MUST change the delivery form by correcting it to the canonical example, and repeating the same command SHALL NOT count as a retry. When both retries fail, the caller SHALL stop and show the error, except that the `/sai-3-implement` coordinator SHALL keep the same facts in `run-state.md` in its run directory and continue the run. The retry counter SHALL belong to that one emit, not to the session. The rule SHALL apply to every emitter, including coordinators that declare a `step_machine`, and SHALL run before any store failure is declared, because a delivery failure is not a store failure. Every other emit error SHALL keep today's stop-and-wait or degraded-mode behavior without retry: a logic failure (`INVALID_EVENT` without `reason`), `UNKNOWN_MACHINE`, `VERSION_MISMATCH`, or an unreachable or degraded store.

#### Scenario: Delivery failure is corrected and retried without asking
- **WHEN** an emit answers `INVALID_EVENT` with `reason: "EVENT_UNPARSEABLE"` or `reason: "BLOCK_COMPOSITION_FAILED"`
- **THEN** the caller retries that emit in its canonical form without asking the user, at most twice, and stops and shows the error if both retries fail

#### Scenario: Logic failure stops without retry
- **WHEN** an emit answers `INVALID_EVENT` without `reason`
- **THEN** the caller stops, shows the error, and waits for the user without retrying

#### Scenario: Step-machine coordinator retries before declaring a store failure
- **WHEN** a coordinator that declares a `step_machine` receives an emit usage error with exit 2
- **THEN** it runs the corrective retry before treating the result as a store failure

#### Scenario: Implement continues from the run-state file

- **WHEN** an `implement-run@1` emit of the `/sai-3-implement` coordinator still fails after both corrective retries
- **THEN** the coordinator keeps the same facts in `run-state.md` in the run directory and the run continues

#### Scenario: Implement-new continues from the run-state file
- **WHEN** the command catalog is read
- **THEN** no `/sai-3-implement-new` command exists, so run-state continuation is owned only by `/sai-3-implement` and its `implement-run@1` emits

### Requirement: Recorded lists carry identifiers only
The stage-machine policy SHALL require that a recordedList event carries only list identifiers (such as E1, E2, I1, or Step ids) and never item text, because the machine uses the list only for its recorded or empty state. Explore-slice is the sole exception: its recordedList carries change names, which are kebab-case identifiers, because that machine tracks slices by name. Route events SHALL carry no slice name and no pick; the machine always chooses the first pending entry in that ordered inventory.

#### Scenario: Caller records an agreed edge-case list
- **WHEN** a caller records an agreed edge-case list through a recordedList emit
- **THEN** the payload carries identifiers such as E1,E2 and no item text

#### Scenario: Explore route emits carry no slice name
- **WHEN** a Plan or Direct Build route emits to explore-slice
- **THEN** the emit carries only route intent with no slice name and the first pending entry starts.

### Requirement: Block emit travels as literal text
The stage-machine policy SHALL document the block emit under § Event delivery as the one exception to single-quoted JSON delivery. The block set SHALL travel as literal text in files, never through a shell command: the block set in a block file and its verdicts in a verdicts file, both written with the harness-native file-write tool per `sai/policies/ready-to-propose-format.md` § Block and verdict delivery and passed as absolute paths, with an invocation identical in Bash and PowerShell 7 on both Claude Code and opencode. The set SHALL be written exactly as it will be displayed, and the verdicts file SHALL hold one JSON array, `[]` when no line is flagged; the composer adds the `<<<VERDICTS>>>` line, so the displayed set never contains it. The policy SHALL NOT document a heredoc or here-string block delivery. The policy SHALL state that a block emit that cannot be delivered returns `BLOCK_COMPOSITION_FAILED` and falls under the corrective retry, and that when the files cannot be prepared the emit stops and reports the error with no stdin fallback. It SHALL also state that a validation failure does not fall under the corrective retry and follows the retry rule of the command that sends the block set.

#### Scenario: Reader sends a block set from either shell
- **WHEN** a reader follows the block emit example in Bash or PowerShell
- **THEN** they pass the block set and its verdicts as `--block-file <path> --verdicts-file <path>`, with no heredoc, here-string, or stdin pipe

#### Scenario: Validation failure is not a delivery failure
- **WHEN** a block emit returns an invalid `validation` verdict with no `reason`
- **THEN** the corrective retry does not apply, and the sending command's own retry rule governs
