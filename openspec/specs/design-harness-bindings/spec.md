# Design Harness Bindings Specification

## Purpose

Define the Claude Code and opencode harness bindings for the design coordinator-worker infrastructure: notice acknowledgement protocol, agent installation, collision handling, and permission configuration.

## Interfaces

### NoticeAcknowledgement

```text
NoticeAcknowledgement = "continue_after_notice"
```

## Requirements

### Requirement: notice-acknowledgement-by-continuation-reference

Claude and opencode SHALL acknowledge notices through the captured continuation reference with exactly `continue_after_notice`.

#### Scenario: Claude acknowledges via SendMessage
- **WHEN** Claude receives a DesignNotice payload
- **THEN** it SHALL send `SendMessage(to: "<captured agent ID>", message: "continue_after_notice")`
- **AND** the message SHALL be exactly `"continue_after_notice"` and no other value

#### Scenario: opencode acknowledges via task
- **WHEN** opencode receives a DesignNotice payload
- **THEN** it SHALL continue with `task(task_id: "<captured task ID>", prompt: "continue_after_notice")`
- **AND** the prompt SHALL be exactly `"continue_after_notice"` and no other value

### Requirement: acknowledgement-excluded-from-artifacts

The notice acknowledgement SHALL be absent from opaque history, pending feedback, and user-answer handling.

#### Scenario: acknowledgement absent from artifacts
- **WHEN** a notice is acknowledged
- **THEN** the acknowledgement SHALL NOT appear in the opaque input history
- **AND** SHALL NOT be recorded as pending feedback
- **AND** SHALL NOT be processed through user-answer handling

### Requirement: claude-installation-compatible-agents

Claude installation SHALL reuse exact-compatible user-owned agents without claiming ownership, block incompatible collisions, and preserve edited managed agents during guarded uninstall.

#### Scenario: compatible agent reused
- **WHEN** a user-owned Claude agent exists with compatible content
- **THEN** the installer SHALL reuse it without creating an ownership sidecar
- **AND** SHALL NOT overwrite the user's agent

#### Scenario: incompatible agent blocked
- **WHEN** a user-owned Claude agent exists with incompatible content
- **THEN** the installer SHALL block the installation and report a collision error

#### Scenario: edited managed agent preserved
- **WHEN** a managed Claude agent has been edited by the user
- **THEN** the uninstaller SHALL preserve the edited agent and skip its removal

### Requirement: opencode-config-coordinator-restrictions

The opencode configuration SHALL restrict the coordinator to questions and the two named planning workers, while the design worker SHALL deny all task targets before allowing only `explore`.

#### Scenario: coordinator permission scope
- **WHEN** the opencode agent config for `sai-design-coordinator` is read
- **THEN** its permissions SHALL allow `question`
- **AND** SHALL allow `sai-implementation-planning-worker` and `sai-design-planning-worker` as task targets
- **AND** SHALL deny all other task targets

#### Scenario: design worker permission scope
- **WHEN** the opencode agent config for `sai-design-planning-worker` is read
- **THEN** `task['*']` SHALL be set to `deny`
- **AND** `task.budget` SHALL be set to `allow`
- **AND** `task.explore` SHALL be set to `allow`
- **AND** `task` SHALL contain NO other allow entries beyond `budget` and `explore`

### Requirement: Claude Code uses separate low-effort coordinator and high-effort worker bindings
The Claude Code `/sai-2-design` wrapper SHALL run the coordinator on `claude-opus-4-8` with low effort and SHALL permit only `Skill`, `Agent`, `SendMessage`, and `AskUserQuestion`; file, search, shell, web, git, and OpenSpec tools SHALL be unavailable to it. It SHALL load both the design-worker binding and the existing implementation-worker binding so Continue now can dispatch the latter with the explicit resolved-change envelope. The SAI-namespaced design worker definition SHALL run `claude-opus-4-8` with high effort and SHALL have `Read`, `Glob`, `Grep`, `Bash`, `Edit`, `Write`, `Agent`, and `Skill` access, including the Claude budget-explorer binding required for source discovery. Its binding SHALL capture the dispatched agent ID and use harness-native continuation for later answers and feedback.

#### Scenario: Claude Code dispatches design work
- **WHEN** `/sai-2-design` starts in Claude Code
- **THEN** the low-effort coordinator SHALL dispatch `sai-design-planning-worker`, capture its agent ID outside the worker payload, and continue that agent for later `needs_input` answers

### Requirement: opencode uses high-reasoning GLM 5.2 for both roles
The canonical opencode configuration SHALL define SAI-namespaced `sai-design-coordinator` and `sai-design-planning-worker` entries, both using GLM 5.2 with high reasoning. The coordinator SHALL be a primary agent restricted to the native `question` tool and exactly the `sai-design-planning-worker` and existing `sai-implementation-planning-worker` task bindings, with read, search, edit, shell, web, git, and OpenSpec access denied; the design worker SHALL be a subagent with technical I/O permissions and `permission.task` SHALL deny all targets before allowing `explore` for mandatory source discovery. The opencode wrapper frontmatter SHALL contain `agent: sai-design-coordinator` and `subtask: false` and SHALL omit `model`, so command-level model selection cannot bypass or override the coordinator entry's GLM 5.2 `variant: high`. The wrapper SHALL load both worker bindings. The design-worker binding SHALL capture and continue the harness task ID outside the worker-authored payload, and Continue now SHALL use the existing implementation-worker binding unchanged.

#### Scenario: opencode dispatches and resumes design work
- **WHEN** `/sai-2-design` starts in opencode and the worker later requests input
- **THEN** `sai-design-coordinator` SHALL dispatch `sai-design-planning-worker`, retain the task ID in invocation-scoped coordinator state, and continue that task after presenting the native question

#### Scenario: opencode wrapper selects the configured coordinator
- **WHEN** `commands/opencode/sai-2-design.md` activates routed design
- **THEN** its frontmatter SHALL contain `agent: sai-design-coordinator` and `subtask: false`, SHALL contain no `model` field, and the selected configuration entry SHALL use GLM 5.2 with `variant: high`

#### Scenario: Claude acknowledges a design notice
- **WHEN** a design worker notice is returned with a binding-captured agent ID
- **THEN** the coordinator SHALL call `SendMessage(to: "<captured agent ID>", message: "continue_after_notice")` and await the same worker's next result

#### Scenario: opencode acknowledges a design notice
- **WHEN** a design worker notice is returned with a binding-captured task ID
- **THEN** the coordinator SHALL call `task(task_id: "<captured task ID>", prompt: "continue_after_notice")` and await the same worker's next result

#### Scenario: opencode wrapper maps the legacy echo label
- **WHEN** `commands/opencode/sai-2-design.md` emits the exact line `**Change-name argument and and optional flags:** $ARGUMENTS`
- **THEN** the coordinator SHALL copy only the substituted value after that exact label into `wrapper_echo_value`, preserving token order for worker-owned change-name and `--fast-track` extraction

### Requirement: Routed bindings are structurally tested and live-probed
Activation SHALL include structural tests for Claude Code and opencode coordinator tool denial, design-worker artifact I/O, design-worker budget-explorer or `explore` access, lifecycle metadata, same-worker continuation, prerequisite-failure suppression of the fast-track notice, successful notice continuation, duplicate-notice suppression after fallback, opencode legacy wrapper-echo extraction with change name plus `--fast-track` in both token orders, and Continue-now dispatch through the existing implementation-worker binding with a fresh lifecycle namespace. Before routed wrappers are activated, Claude Code and opencode SHALL each be smoke-tested for design-worker dispatch, mandatory nested source-research dispatch, input relay, nonterminal notice relay, continuation, complete changed-file reporting, fresh-worker reconstruction with opaque input history and pending feedback, and the explicit resolved-change implementation handoff without design-state leakage. These routed-binding tests SHALL NOT be applied to Copilot's inline path. A failed required probe SHALL block activation rather than weaken delegation or persistence rules.

#### Scenario: opencode permission probe runs
- **WHEN** the opencode routed definitions are ready for activation
- **THEN** a live probe SHALL verify coordinator question access, coordinator task restriction to both named planning workers, design-worker `explore` dispatch, returned-task-ID continuation, reconstruction with interaction history, and explicit-envelope implementation-worker dispatch under restrictive top-level permissions

#### Scenario: Claude routed smoke runs
- **WHEN** the Claude routed definitions are ready for activation
- **THEN** a live smoke SHALL verify low-effort coordinator isolation, high-effort design-worker dispatch, budget-explorer source discovery, agent-ID continuation, reconstruction with interaction history, and explicit-envelope implementation-worker dispatch

### Requirement: Copilot preserves the inline compatibility path
The GitHub Copilot `/sai-2-design` wrapper SHALL retain the existing inline design workflow and observable behavior. Documentation SHALL state precisely that supported Copilot surfaces do not expose one portable harness-owned contract for capturing a worker identifier and continuing that same worker across coordinator turns; it SHALL NOT claim that Copilot lacks subagent support.

#### Scenario: Copilot runs design
- **WHEN** `/sai-2-design` is invoked in GitHub Copilot
- **THEN** the existing inline path SHALL execute without requiring the routed coordinator, design worker definition, or lifecycle continuation binding

### Requirement: Design binding definitions are collision-safe and ownership-aware
Design coordinator and worker identifiers SHALL be SAI-namespaced. Installation SHALL create absent managed definitions, reuse exact-compatible pre-existing definitions without adopting ownership, and stop on incompatible collisions without overwriting user content. Claude worker uninstall SHALL delete only a SAI-created definition whose ownership record still matches its current content; modified or user-owned definitions SHALL be preserved. Opencode uninstall SHALL preserve pre-existing and installed namespaced configuration entries under the established policy.

#### Scenario: Compatible user-owned Claude worker exists
- **WHEN** installation finds an exact-compatible `sai-design-planning-worker` definition without a SAI ownership record
- **THEN** installation SHALL reuse it, SHALL NOT create an ownership record, and uninstall SHALL preserve it

#### Scenario: Incompatible namespaced definition exists
- **WHEN** installation finds an incompatible Claude agent file or opencode agent entry at a design coordinator or worker identifier
- **THEN** installation SHALL stop with rename-or-remove remediation and SHALL NOT overwrite the definition or partially install the conflicting managed surface

#### Scenario: SAI-created Claude worker was edited
- **WHEN** uninstall finds a worker ownership record but the current worker content no longer matches its recorded managed hash
- **THEN** uninstall SHALL preserve the worker definition and remove only stale ownership metadata according to the established guarded-uninstall policy
