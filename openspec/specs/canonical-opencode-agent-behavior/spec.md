# canonical-opencode-agent-behavior Specification

## Purpose
TBD - created by syncing change canonicalize-opencode-agent-behavior. Update Purpose after archive.

## Requirements

### Requirement: Canonical generic-agent behavior policies
The repository SHALL provide behavior-only policy files at `sai/policies/budget-agent.md`, `sai/policies/executor-agent.md`, and `sai/policies/explore-agent.md`. Each file SHALL be the canonical source for the behavior of the correspondingly named generic-agent role of either supported harness — the opencode agents `agents/opencode/{explore,executor,budget}.md` and the Claude agents `agents/claude/{budget-explorer,budget-executor,budget-subagent}.md` — SHALL be independently fetchable through the `sai/policies/` namespace, and SHALL contain no agent frontmatter, model selection, installer logic, native harness import, or harness-specific registration.

#### Scenario: all three policy targets are available
- **WHEN** the three generic-agent behavior policies are resolved
- **THEN** `Fetch @sai/policies/budget-agent.md` supplies the budget behavior
- **AND** `Fetch @sai/policies/executor-agent.md` supplies the executor behavior
- **AND** `Fetch @sai/policies/explore-agent.md` supplies the explore behavior

#### Scenario: policies are projected through the existing SAI policy surface
- **WHEN** the repository's existing recursive SAI-policy projection is installed for either supported harness
- **THEN** each of the three policy files is available at its corresponding `sai/policies/` path
- **AND** no additional agent or installer projection is required

#### Scenario: Claude generic agents consume the same policies
- **WHEN** the Claude generic agent `agents/claude/budget-explorer.md` (or `budget-executor.md` or `budget-subagent.md`) is dispatched
- **THEN** it resolves its behavior from the same-named `sai/policies/` policy that the corresponding opencode role resolves

### Requirement: Budget behavior remains canonical
The budget policy SHALL preserve the cost-controlled single-task contract: execute exactly one requested task, do not expand scope or self-correct after failure, minimize output, return the structured completion fields `status`, `actions_taken`, optional `failures`, and optional `output`, abort on an interactive permission block with a failed result, and stop after approximately 30 tool calls rather than expanding the task.

#### Scenario: budget work completes within the contract
- **WHEN** the budget agent receives one file-operation, search, write, or code-analysis task without an interactive permission block
- **THEN** it performs only that task
- **AND** it returns a structured completion report with the contract's required field names
- **AND** it does not add unrelated recommendations or raw unfiltered output

#### Scenario: budget work encounters a permission block
- **WHEN** a requested tool call requires interactive user approval
- **THEN** the budget behavior stops immediately
- **AND** it returns a failed result identifying the blocked operation and required permission
- **AND** it does not wait or retry

### Requirement: Executor behavior remains canonical
The executor policy SHALL preserve the execute-only command-runner contract: run exactly the requested command, do not retry or self-correct after failure, prefer narrow and low-output commands, run independent requested commands in parallel, and report failures with the exit code, one-line reason, and exact file and line locations when applicable. Test or build runs SHALL additionally report pass/fail tallies and per-failure details.

#### Scenario: executor runs a requested command
- **WHEN** the executor receives a command request
- **THEN** it runs that command without expanding the scope or proposing unrelated changes
- **AND** it uses the narrowest suitable command before any broader requested sweep

#### Scenario: executor command fails
- **WHEN** a requested command exits unsuccessfully
- **THEN** the executor reports the exit code and one-line failure reason
- **AND** it reports applicable exact files and line numbers
- **AND** it does not retry or modify files to force success

### Requirement: Explore behavior remains canonical
The explore policy SHALL preserve the read-only research contract: use a clean context for lookup and documentation research, do not write files, return only the caller's structured summary contract, do not dump raw file contents or unfiltered search output, and respect a maximum of 30 tool calls per spawn. Every spawn MUST declare in its prompt: the exact fields expected in the response, a hard length cap stated as a word or line count, and an explicit `no raw file contents` rule (or `verbatim excerpts required` for audit mode).

#### Scenario: explore performs bounded research
- **WHEN** the explore agent receives a read-only lookup or research task with a caller-declared output contract
- **THEN** it reads and searches only as needed for that task
- **AND** it returns the declared structured summary within the stated cap
- **AND** it performs no file write

#### Scenario: explore rejects an incomplete output contract
- **WHEN** a caller attempts to spawn explore without exact response fields, a hard word-or-line cap, or the required raw-content instruction
- **THEN** the dispatch is non-compliant and does not start as a valid explore research run
- **AND** the caller is asked to provide the missing output-contract elements

#### Scenario: explore reaches its tool-call cap
- **WHEN** the research task would exceed 30 tool calls
- **THEN** the explore behavior stops at the cap
- **AND** the caller is told to spawn an additional explore agent rather than raising the cap

### Requirement: Generic agents of both harnesses delegate behavior through Fetch
Each generic agent source of both harnesses SHALL retain its managed frontmatter and SHALL have a body beginning with its harness-specific fetch-skill bootstrap followed by exactly one established Fetch directive: under `agents/opencode/`, `explore.md` SHALL fetch `@sai/policies/explore-agent.md`, `executor.md` SHALL fetch `@sai/policies/executor-agent.md`, and `budget.md` SHALL fetch `@sai/policies/budget-agent.md`; under `agents/claude/`, `budget-explorer.md` SHALL fetch `@sai/policies/explore-agent.md`, `budget-executor.md` SHALL fetch `@sai/policies/executor-agent.md`, and `budget-subagent.md` SHALL fetch `@sai/policies/budget-agent.md`. The wrappers SHALL use the Fetch mechanism rather than a native harness import and SHALL not duplicate the canonical behavior body.

#### Scenario: each wrapper resolves its matching policy
- **WHEN** `agents/opencode/budget.md`, `agents/opencode/executor.md`, `agents/opencode/explore.md`, `agents/claude/budget-subagent.md`, `agents/claude/budget-executor.md`, and `agents/claude/budget-explorer.md` are read
- **THEN** each has its harness-specific fetch-skill bootstrap as the first body line followed by one body Fetch line targeting the policy of its role
- **AND** the policy lines use the `Fetch @sai/policies/<name>-agent.md` form
- **AND** no wrapper uses a native harness import

#### Scenario: generic wrappers bootstrap fetch resolution
- **WHEN** any managed generic agent source is read after projection
- **THEN** its body begins with the harness bootstrap and then fetches only the matching canonical `sai/policies/<role>-agent.md` policy

#### Scenario: project-local agent instructions extend the fetched policy
- **WHEN** the existing `bin/install` setup materializes a user-owned `.opencode/agents/<name>.md` from the managed wrapper and appends project-specific instructions after its Fetch line
- **AND** no project-local `.opencode/sai/policies/<name>-agent.md` shadows the canonical Fetch target
- **THEN** the wrapper first resolves the global canonical `sai/policies/<name>-agent.md` policy
- **AND** the appended project-specific instructions remain available after the fetched policy
- **AND** the wrapper's managed frontmatter, agent name, and selected model or variant remain unchanged

#### Scenario: project-local Claude agent instructions extend the fetched policy
- **WHEN** the existing setup materializes a user-owned `.claude/agents/<name>.md` from the managed Claude wrapper and appends project-specific instructions after its Fetch line
- **AND** no project-local `.claude/sai/policies/<name>-agent.md` shadows the canonical Fetch target
- **THEN** the wrapper first resolves the global canonical `sai/policies/<name>-agent.md` policy
- **AND** the appended project-specific instructions remain available after the fetched policy
- **AND** the wrapper's managed frontmatter, agent name, and selected `model` and `effort` remain unchanged

#### Scenario: a global policy update reaches a project-local agent extension
- **WHEN** the existing `bin/install` setup has materialized a user-owned `.opencode/agents/<name>.md` from the managed wrapper
- **AND** the project-local agent file retains its Fetch line and appended instructions
- **AND** no project-local `.opencode/sai/policies/<name>-agent.md` shadows the canonical Fetch target
- **AND** the global canonical `sai/policies/<name>-agent.md` is updated
- **THEN** a subsequent resolution uses the updated global policy before the appended instructions
- **AND** the selected `model` and `variant` remain the values held by the project-local agent
- **AND** the appended project-specific instructions remain intact
- **AND** a project-local policy file is not required or treated as the extension mechanism

#### Scenario: a global policy update reaches a project-local Claude agent extension
- **WHEN** the existing setup has materialized a user-owned `.claude/agents/<name>.md` from the managed Claude wrapper
- **AND** the project-local agent file retains its Fetch line and appended instructions
- **AND** no project-local `.claude/sai/policies/<name>-agent.md` shadows the canonical Fetch target
- **AND** the global canonical `sai/policies/<name>-agent.md` is updated
- **THEN** a subsequent resolution uses the updated global policy before the appended instructions
- **AND** the selected `model` and `effort` remain the values held by the project-local agent
- **AND** the appended project-specific instructions remain intact
- **AND** a project-local policy file is not required or treated as the extension mechanism

#### Scenario: rerunning setup preserves the local extension and tunables
- **WHEN** the existing `bin/install` setup is rerun against an existing `.opencode/agents/<name>.md`
- **AND** that agent file already contains its canonical Fetch line, appended project-specific instructions, and selected `model` or `variant` values
- **THEN** the Fetch line remains present and still targets the canonical `sai/policies/<name>-agent.md` policy
- **AND** the appended project-specific instructions remain intact after the Fetch line
- **AND** the selected `model` and `variant` values remain unchanged

#### Scenario: rerunning setup preserves the Claude local extension and tunables
- **WHEN** the existing setup is rerun against an existing `.claude/agents/<name>.md`
- **AND** that agent file already contains its canonical Fetch line, appended project-specific instructions, and selected `model` and `effort` values
- **THEN** the Fetch line remains present and still targets the canonical `sai/policies/<name>-agent.md` policy
- **AND** the appended project-specific instructions remain intact after the Fetch line
- **AND** the selected `model` and `effort` values remain unchanged
