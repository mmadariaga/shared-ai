# auto-fast-archive-execution Specification

## Purpose
TBD - created by archiving change worker-owned-autofast-mutations. Update Purpose after archive.

## Requirements

### Requirement: Attribute archive execution to Direct Build

Direct Build (unattended) SHALL use the existing archive worker's read-only preparation followed by one validated CLI archive invocation, owned-path staging, and pre-authorized local commit continuation.

#### Scenario: Direct Build completes archive execution

- **WHEN** Direct Build reaches archive execution
- **THEN** the existing one-commit boundary remains unchanged and the archive worker uses the validated CLI archive order

### Requirement: Validated archive execution continuation

The archive worker SHALL perform classification, completion, informational delta comparison, unchecked-item, and collision checks during preparation before accepting an execution order. Preparation SHALL return the validated archive destination, owned staging paths, and commit boundary without mutating files, archive directories, staging, or commits.

#### Scenario: Direct Build preparation returns a non-mutating plan

- **WHEN** the archive worker prepares a Direct Build operation
- **THEN** it returns the validated mutation plan without invoking the CLI, writing files, moving directories, staging paths, or creating a commit

### Requirement: Ordered archive mutations

Authorized archive execution SHALL first, and only when the prepared plan recorded one or more `retired_capabilities`, re-check the declaration preconditions of the archive instructions against the current files: the author veto, an unhonoured `retire_capabilities` value, unaccounted content in each emptied capability's published spec, and the metadata precondition that `.openspec.yaml` exists, parses, and carries `schema:`. If any of them blocks, the worker SHALL write nothing, SHALL NOT run the CLI archive, and SHALL return a closed `failed` result naming the blocking condition and its way forward; it MUST NEVER create `.openspec.yaml` and MUST NEVER author a `schema:` value. Otherwise it SHALL write the single key `retire_capabilities: true` into `openspec/changes/<name>/.openspec.yaml` through the active command-execution tool using Bash or PowerShell 7 as a parse-verified replace-in-place, judging the skip, the veto, and the unhonoured value on the parsed YAML value rather than the literal text, never appending a second entry, and adding that file to `changed_files` when it was written; after writing it SHALL re-parse the file and, if the file no longer parses or `retire_capabilities` does not read back as the boolean `true`, SHALL return a closed `failed` result that names the file it wrote and states the way forward: restore `openspec/changes/<name>/.openspec.yaml` with `git checkout HEAD -- openspec/changes/<name>/.openspec.yaml` when it is tracked or by hand when it is not before `sai-archive` is rerun, without running the CLI archive and without reverting the write itself. It SHALL then run exactly `openspec archive <name> --yes --json` as the sole synchronization-and-move primitive and SHALL parse its JSON result. After successful CLI completion, it SHALL classify every supplied approved path using deletion-aware trackedness and ignore checks before staging, stage only eligible paths, and create one local commit from staged state by passing the complete message on standard input to `git commit -F -` when eligible paths remain. Untracked ignored paths SHALL be omitted with a warning. Force-add and broad staging commands MUST NOT be used. With no recorded `retired_capabilities`, `.openspec.yaml` SHALL NOT be touched, no retirement precondition re-check SHALL run, and a failure of the CLI invocation SHALL NOT revert a written declaration.

#### Scenario: A validated order executes once

- **WHEN** the coordinator forwards a validated order whose prepared plan recorded no retired capability
- **THEN** the worker does not touch `.openspec.yaml`, performs no retirement precondition re-check, runs the CLI archive first, then exact-path staging and at most one authorized local commit without pushing, amending, or staging unrelated files

#### Scenario: A validated order with a recorded retirement executes once

- **WHEN** the coordinator forwards a validated order whose prepared plan recorded one or more retired capabilities and every re-checked precondition passes
- **THEN** the worker writes the retirement declaration as a parse-verified replace-in-place, records the written path in `changed_files`, runs the CLI archive, then performs exact-path staging and at most one authorized local commit without pushing, amending, or staging unrelated files

#### Scenario: Mixed approved paths

- **WHEN** approved paths include tracked files, tracked deletions, untracked non-ignored files, and untracked ignored files
- **THEN** the first three categories are staged through the exact allowlist, ignored files are omitted with warnings, and execution continues

#### Scenario: All approved paths are ignored

- **WHEN** every approved path is untracked and ignored
- **THEN** no path is force-added, the index remains empty, and no commit message or commit is created

### Requirement: Archive execution failure is explicit

The worker MUST stop after a failed CLI invocation, classification, staging operation, message-authoring operation, or commit operation, report the exact completed and uncompleted state with its failure class, and MUST NOT silently retry or continue to a later action. A CLI failure or invalid JSON MUST stop before staging and commit: the worker SHALL return `failed` with the exact error, verbatim, and end the order there, because recovery belongs to the coordinator. A failed order SHALL leave the state as it is for the coordinator to verify. A successful execution SHALL consume the order, and any later execute continuation or replacement SHALL be rejected without mutation. The worker SHALL accept a new execute order only after an order that failed before its first mutation; the coordinator issues one under `sai/policies/unattended-runtime-recovery.md` § Execute orders, and it SHALL be validated like the first.

#### Scenario: CLI archive failure stops the order

- **WHEN** the CLI exits unsuccessfully or emits invalid JSON
- **THEN** the worker returns a closed failure carrying the exact CLI error verbatim and performs no staging, message authoring, retry, or commit

#### Scenario: Non-ignore staging failure

- **WHEN** classification or exact-path staging fails for a reason other than an ignored untracked path
- **THEN** execution terminates without retrying, authoring a message, or creating a commit

#### Scenario: A new order follows a failure before the first mutation

- **WHEN** an execute order failed before its first mutation and the coordinator issues a new order under the recovery policy
- **THEN** the worker validates the new order like the first and executes it

### Requirement: The execute continuation verify carries allow_commit

The Direct Build (unattended) archive execute continuation is the only dispatch in the system that carries `allow_commit`: its guard window's verify SHALL run with `--allow-commit`, because the validated closed execution order contains the one pre-authorized local commit. The flag SHALL never be persisted, SHALL never travel as an envelope key, and SHALL be carried by no other dispatch.

#### Scenario: the pre-authorized local commit passes its window

- **WHEN** the execute continuation's validated closed order performs the one pre-authorized local commit inside its window
- **THEN** the window's verify runs with `--allow-commit` and resolves verdict `allowed`
- **AND** the flag is consumed for that window only and never persisted

### Requirement: The retirement declaration SHALL be a named member of the closed execution order

The closed Direct Build (unattended) archive execution order SHALL enumerate the conditional `retire_capabilities` retirement declaration and the capabilities it retires alongside the resolved change name, the exact date-prefixed archive destination, the exact owned staging paths, and the one pre-authorized local commit action. Because the declaration is a named member of that enumeration, the worker validating its own order SHALL accept step 0 as authorized content rather than rejecting the order as altered or writing without authorization. When the pre-flight refused the declaration, the worker SHALL return the refusal instead of a plan and no execution continuation SHALL be sent.

#### Scenario: An order carrying the declaration is not an altered order

- **WHEN** the worker validates a closed Direct Build archive order whose prepared plan recorded one or more retired capabilities
- **THEN** it accepts the retirement declaration as authorized content of the order and neither rejects the order as altered nor writes without authorization

### Requirement: The Direct Build commit body and terminal summary SHALL name every retired capability id

When the prepared plan recorded one or more `retired_capabilities` and a commit is actually
created under the already-consumed Direct Build (unattended) commit authorization, the authored
message SHALL name every retired capability id on its own line in the message **body** and never
in the subject: the subject SHALL stay exactly what the commit-message rules derive from the
staged state, so the Conventional Commits format is unchanged. The two conditions SHALL be
independent — a recorded retirement with no commit, whether because the empty-index guard fired or
because an earlier terminal stop occurred, SHALL produce no body line, and a commit with no
recorded retirement SHALL produce none either. The rule SHALL add no extra commit and no second
write, and the prohibition on amending, pushing, force-pushing, and asking for a second commit
SHALL remain in force. Whenever the prepared plan recorded one or more `retired_capabilities`, the
terminal summary of the execute continuation SHALL name every retired capability id, exactly as
the prepare stretch's summary does, as report text only: it SHALL carry no options, accept no
answer, and SHALL NOT block the run. With an empty `retired_capabilities` set, no such line SHALL
appear.

#### Scenario: An unattended commit records the retired ids

- **WHEN** an authorized Direct Build archive order whose prepared plan recorded retired capabilities passes the empty-index guard and creates its one local commit
- **THEN** the commit message body names every retired capability id on its own line, the subject is unchanged, and no amend or push occurs

#### Scenario: An empty index after a retirement emits no body line

- **WHEN** the prepared plan recorded a retirement but the empty-index guard prevents the commit
- **THEN** no message is authored and no retired-capability body line exists, while the terminal summary still names every retired capability id

#### Scenario: No recorded retirement leaves the report unchanged

- **WHEN** an authorized Direct Build archive order whose prepared plan recorded no retired capability completes
- **THEN** neither the commit message body nor the terminal summary carries a retired-capability line

### Requirement: Archive worker uses the active command-execution tool in Direct Build execution

In the Direct Build execution continuation, `sai/commands/archive/worker.md` SHALL state that the worker holds no Write or Edit tool and SHALL use the active command-execution tool with Bash or PowerShell 7. The worker SHALL perform the CLI archive invocation, exact-path staging, and one local commit by passing the complete message on standard input to `git commit -F -`. When no supported command-execution tool is available, it SHALL return a closed `failed` result before the first mutation rather than simulating a write through another channel.

#### Scenario: Direct Build execution uses the active supported shell

- **WHEN** the archive worker executes its validated Direct Build order with Bash or PowerShell 7 available
- **THEN** the CLI invocation, staging, and authorized local commit use that command-execution tool and no Write or Edit call is attempted

#### Scenario: No supported shell is available during Direct Build execution

- **WHEN** neither Bash nor PowerShell 7 is available in the Direct Build execution continuation
- **THEN** the worker returns a closed `failed` result and performs no mutation through another channel
