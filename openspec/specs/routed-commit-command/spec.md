# routed-commit-command Specification

## Purpose

Define the routed coordinator/worker architecture for `/sai-commit`: a minimal-lifecycle phase adapter whose coordinator owns lifecycle routing, authorization presentation, and the destructive git mutation, while the dispatched `sai-commit-worker` owns message authoring and never mutates git — with end-to-end worker registration and the openspec prerequisite exemption carried by the routed cards.
## Requirements
### Requirement: Routed card set and boot routing

`sai-commit` SHALL be a routed-shaped command whose card set is exactly `sai/commands/commit/coordinator.md` and `sai/commands/commit/worker.md` (no `invocation.md`; the legacy utility `body.md` is retired). Both harness boot adapters (`sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`) SHALL classify `commit` among the routed names so that selecting it fetches `@sai/commands/commit/coordinator.md`, and SHALL exclude `commit` from the utility-name lists; no boot path SHALL select a commit `body.md`.

#### Scenario: Both boots route commit to the coordinator card

- **WHEN** either supported harness boots with `command_name` set to `commit`
- **THEN** `commit` appears in that boot adapter's routed-name list and the selected card is `@sai/commands/commit/coordinator.md`
- **AND** `commit` does not appear in the boot's utility-name list

#### Scenario: The utility body surface is retired

- **WHEN** `sai/commands/commit/` is inspected after the change
- **THEN** no `body.md` exists and no adapter, launcher, or test fixture selects one for `sai-commit`

### Requirement: Minimal lifecycle adapter

The commit coordinator SHALL declare the minimal phase-adapter field set: `original_envelope` is exactly the opaque single-string `arguments_value` received from the active wrapper byte-for-byte; `dispatch_operation` dispatches exactly one `sai-commit-worker` through the active commit-worker binding using that envelope; `continuation_operation` continues the same worker forwarding the selected answer value; `allowed_nonterminal_extensions` is none. The adapter SHALL declare NO `progress_plan` — no progress event exists in this lifecycle, no panel plan renders, and no acknowledgement literal is defined — and NO `recovery_policy`: the coordinator SHALL NOT fetch `@sai/policies/bounded-recovery.md`, keep no recovery ledger, and perform no recovery continuations. A replacement worker SHALL reconstruct only from the complete original envelope, the opaque input history (including forwarded authorization answers), and the ordered duplicate-free changed-files union.

#### Scenario: A commit run carries no progress or recovery machinery

- **WHEN** the commit coordinator card is read
- **THEN** it declares no `progress_plan`, defines no progress event or acknowledgement literal, declares no `recovery_policy`, and never fetches the bounded-recovery policy

#### Scenario: Envelope stays opaque end-to-end

- **WHEN** a `/sai-commit` invocation forwards its request to the worker
- **THEN** the worker receives exactly the original single-string `arguments_value` and no parsed, cleaned, or persisted variant of it

### Requirement: Worker owns authoring and never mutates git

The dispatched `sai-commit-worker` SHALL perform the technical procedure of calling `node sai/tools/commit.js collect --json` to retrieve staged state and repository style, compose a commit message using that data, and verify faithfulness — that every claim maps to a hunk in the staged diff — and SHALL return the message and related context as payload content inside the terminal payload's summary for verbatim coordinator presentation. The worker SHALL NEVER execute a git mutation: never `git add`, never `git commit`, never `git stash`, never any state-changing git command; only the read-only inspection surface (reading the collect JSON output) and message authoring remain available to it. The staged-state inspection and repo-style detection themselves are performed by the collect tool, not by the worker.

#### Scenario: Worker calls collect and drafts message
- **WHEN** the commit worker begins its workflow
- **THEN** it calls `node sai/tools/commit.js collect --json`, receives staged state and style as JSON, and composes a message using that data

#### Scenario: Worker delivers content without side effects
- **WHEN** a commit run completes with a composed message
- **THEN** the message and related context arrive at the coordinator as payload content and no git mutation was executed by the worker session

### Requirement: Authorization transport and coordinator-only execution

The authorization ask SHALL be returned by the worker as a `needs_input` lifecycle result carrying the question "Run `git commit`?" with the ordered options `yes (Recommended)` / `no` / `Allow on this session`. The coordinator SHALL present the exact question and options through the native option-picker, append only `{question, options, answer_value}` to the opaque input history, and forward the exact answer value to the same worker. Only the coordinator SHALL execute the authorized mutation, and only after an authorizing answer: on `yes` (or on an already-active session-scoped grant) it invokes `node sai/tools/commit.js apply --json --cwd <repo>` with the worker-authored message on stdin using a heredoc, or the equivalent `node sai/tools/commit.js apply --json --amend --cwd <repo>` invocation when an amend was requested, captures the result, and on success shows the message output. On `Allow on this session` the coordinator additionally activates the in-memory `session_commit_authorized` flag for the remainder of the in-conversation session, never written to any file. On `no` or no answer the coordinator executes nothing, prints the worker-authored summary verbatim, and stops without any git mutation. Terminal output SHALL print the worker-authored summary verbatim on every closure and SHALL close with exactly `Commit done.` only when a commit was executed; every other closure stops without the completion literal.

#### Scenario: Authorized answer triggers coordinator execution
- **WHEN** the user selects `yes` at the presented ask
- **THEN** the forwarded answer returns a completed worker payload restating the exact message, the coordinator alone runs `node sai/tools/commit.js apply` with the worker-authored message on stdin, and the run closes with the summary followed by exactly `Commit done.`

#### Scenario: Decline executes nothing
- **WHEN** the user selects `no` or gives no answer
- **THEN** no git mutation runs, the worker-authored summary is printed verbatim noting the message remains ready to copy, and the stop carries no completion literal

#### Scenario: Session grant skips later asks in the same session
- **WHEN** `Allow on this session` activated the flag and a later commit run reaches the ask in the same conversation
- **THEN** the coordinator skips the presentation wait after printing the proposed message, and proceeds directly to apply execution

### Requirement: Openspec prerequisite exemption carried by the routed cards

The commit coordinator card SHALL restate the documented exemption: `sai-commit` operates on git state only and performs NO openspec prerequisite checks — it SHALL never fetch `@sai/policies/prereqs.md` and SHALL never require the `openspec` binary, an `openspec/` directory, or `schema: sai-workflow`. The worker binding and card correspondingly declare no change resolution and no prerequisite check, keeping `sai-commit` usable in projects without openspec.

#### Scenario: Commit works outside openspec projects

- **WHEN** `sai-commit` runs in a project with no `openspec/` directory
- **THEN** no prerequisite fetch or check occurs and the staged-message flow proceeds normally

### Requirement: End-to-end worker registration

The `sai-commit-worker` identity SHALL be registered across the full projection chain: `bin/worker-matrix.js` gains the `commit` phase entry bringing the matrix to ten entries and extends the worker-identity regex to admit `sai-commit-worker`; `sai/install-manifest.json` (and its generator) declare the claude and opencode managed-agent projections for the worker; the installed-worker roster and binding validators in `bin/install-flow.js` accept the resulting roster; and `sai/commands/commit/launcher.md` carries exactly the binding fetch `Fetch @sai/orchestration/workers/bindings/commit-worker.md and use it.`

#### Scenario: Install validates the ten-worker roster

- **WHEN** install-time roster and binding validation runs after the change
- **THEN** the derived roster contains ten workers including `sai-commit-worker` and both harness projections for it are present exactly once

### Requirement: Session-grant scope has a single source

The exclusion list for session-scoped commit authorization SHALL live exactly once, in the `## Authorization Scope` section of `sai/policies/commit-rules.md`: the grant covers exactly `git add` + `git commit` at the granted gates of the consuming command for the remainder of the in-conversation session, is in-memory only, never authorizes push, force, branch create/switch, rebase, merge, tag, or pull-request actions, and never widens a consuming command beyond what its own contract stages. `sai/commands/apply/coordinator.md` SHALL cite that section instead of duplicating the exclusion sentence.

#### Scenario: Exclusions are edited in one place

- **WHEN** the session-grant exclusion list is updated in `commit-rules.md`
- **THEN** both apply's coordinator-card contract and the commit cards inherit the updated boundary without further edits

