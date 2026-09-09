# commit-command-prose Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: coordinator and worker prose reduced to routing and JSON handling

The `sai/commands/commit/coordinator.md` and `sai/commands/commit/worker.md` SHALL be refactored to separate work by mutation boundary: deterministic mechanics moved to tools, lifecycle routing and authorization handling retained in prose.

#### Scenario: coordinator owns mutation execution via apply
- **WHEN** the commit lifecycle reaches authorization
- **THEN** the coordinator invokes `node sai/tools/commit.js apply` with the authorized message on stdin and handles the result

#### Scenario: worker owns message authoring and calls collect
- **WHEN** the worker begins message composition
- **THEN** it calls `node sai/tools/commit.js collect --json` to retrieve staged state and style, drafts the message based on that data, and presents it for authorization without executing git operations

#### Scenario: sensitive-file handshake is coordinator-owned
- **WHEN** apply returns a sensitive-file block
- **THEN** the coordinator presents the exact detected list to the user and re-invokes apply with `--acknowledge-secrets` on confirmation

### Requirement: instructions.md simplified to tool-based workflow

The `sai/commands/commit/instructions.md` SHALL be updated to describe the worker workflow using the tools: call collect, draft message, request authorization.

#### Scenario: Step 1 replaced with collect invocation
- **WHEN** the worker instructions describe Step 1 (Inspect Staged State)
- **THEN** it directs calling `node sai/tools/commit.js collect --json` rather than running individual git commands

#### Scenario: message composition uses collect output
- **WHEN** the worker drafts the commit message
- **THEN** it uses fields from the collect JSON response: `inferred_scope`, `detected_style`, `files` array for the message body

#### Scenario: authorization question remains unchanged
- **WHEN** the worker reaches authorization
- **THEN** it asks the existing question "Run `git commit`?" with options `yes` / `no` / `Allow on this session`; the question text and options are unchanged

### Requirement: No hard-coded validation logic in prose

Validation rules (subject length, type format, body wrapping, sensitive-file patterns) SHALL live only in `sai/tools/lint.js` and the commit-rules policy, never inlined in `coordinator.md`, `worker.md`, or `instructions.md`.

#### Scenario: prose contains no inline rule checks
- **WHEN** the commit cards are audited post-implementation
- **THEN** no format rules, validation conditions, or sensitive-file patterns appear as literal text; all rules are enforced by the tools

### Requirement: Authorization transport unchanged

The authorization ask, options, and answer forwarding SHALL remain exactly as before; only the execution mechanism moves from prose invocation to tool invocation.

#### Scenario: authorization options are unchanged
- **WHEN** the coordinator presents the authorization question
- **THEN** options remain `yes (Recommended)` / `no` / `Allow on this session` with identical meanings

#### Scenario: coordinator uses answer to invoke apply
- **WHEN** the user selects `yes` or `Allow on this session`
- **THEN** the coordinator forwards the message to apply via stdin and invokes the commit tool

