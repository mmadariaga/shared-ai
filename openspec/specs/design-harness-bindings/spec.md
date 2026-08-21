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

### Requirement: Claude Code uses separate low-effort coordinator and high-effort worker bindings
The Claude Code `/sai-2-design` wrapper SHALL run the coordinator on `claude-opus-4-8` with low effort and SHALL permit only `Skill`, `Agent`, `SendMessage`, and `AskUserQuestion`; file, search, shell, web, git, and OpenSpec tools SHALL be unavailable to it. It SHALL load the design-worker binding and SHALL NOT load the implementation-worker binding, because `/sai-2-design` no longer dispatches the implementation worker. The SAI-namespaced design worker definition SHALL run `claude-opus-4-8` with high effort and SHALL have `Read`, `Glob`, `Grep`, `Bash`, `Edit`, `Write`, `Agent`, and `Skill` access, including the Claude budget-explorer binding required for source discovery. Its binding SHALL capture the dispatched agent ID and use harness-native continuation for later answers and feedback.

#### Scenario: Claude Code dispatches design work
- **WHEN** `/sai-2-design` starts in Claude Code
- **THEN** the low-effort coordinator SHALL dispatch the numbered design worker, capture its agent ID outside the worker payload, and continue that agent for later `needs_input` answers

### Requirement: opencode uses high-reasoning GLM 5.2 for both roles
The canonical projected opencode design-worker agent file SHALL define the numbered design worker as a subagent using GLM 5.2 with high reasoning, with technical I/O permissions and `permission.task` denying all targets before allowing `explore` for mandatory source discovery; the definition SHALL live in the frontmatter of the manifest-projected `agents/opencode/sai-2-design-worker.md` file rather than in the opencode configuration agent map. SAI SHALL neither install a coordinator agent entry nor select one from a wrapper — a user-defined primary agent is outside this constraint: the `/sai-2-design` wrapper frontmatter SHALL contain `model: opencode-go/glm-5.2`, `variant: high`, and `subtask: false`, SHALL omit `agent`, and the coordinator SHALL therefore run on GLM 5.2 with high reasoning selected by the wrapper itself. Its native `question` capability and its `task` dispatch to `sai-2-design-worker` SHALL be preconditions on the active primary agent per `opencode-coordinator-runtime`, not permissions supplied by shipped configuration. The wrapper SHALL load only the design-worker binding. The design-worker binding SHALL capture and continue the harness task ID outside the worker-authored payload.

#### Scenario: opencode dispatches and resumes design work
- **WHEN** `/sai-2-design` starts in opencode and the worker later requests input
- **THEN** the wrapper-run coordinator SHALL dispatch the numbered design worker, retain the task ID in invocation-scoped coordinator state, and continue that task after presenting the native question

#### Scenario: opencode wrapper declares its coordinator runtime
- **WHEN** `commands/opencode/sai-2-design.md` activates routed design
- **THEN** its frontmatter SHALL contain `model: opencode-go/glm-5.2`, `variant: high`, and `subtask: false`, and SHALL contain no `agent` field

#### Scenario: The projected design-worker agent carries the canonical definition
- **WHEN** a fresh opencode installation projects `sai-2-design-worker.md`
- **THEN** the file SHALL declare `mode: subagent`, `model: opencode-go/glm-5.2`, `variant: high`, and `permission.task` denying all targets before allowing `explore`
- **AND** the canonical opencode configuration sample SHALL NOT define the design worker entry

#### Scenario: Claude acknowledges a design notice
- **WHEN** a design worker notice is returned with a binding-captured agent ID
- **THEN** the coordinator SHALL call `SendMessage(to: "<captured agent ID>", message: "continue_after_notice")` and await the same worker's next result

#### Scenario: opencode acknowledges a design notice
- **WHEN** a design worker notice is returned with a binding-captured task ID
- **THEN** the coordinator SHALL call `task(task_id: "<captured task ID>", prompt: "continue_after_notice")` and await the same worker's next result

### Requirement: Routed bindings are structurally tested and live-probed
Activation SHALL include structural tests for Claude Code and opencode coordinator tool denial, design-worker artifact I/O, design-worker budget-explorer or `explore` access, lifecycle metadata, same-worker continuation, prerequisite-failure suppression of the fast-track notice, successful notice continuation, duplicate-notice suppression after fallback, opencode invocation-envelope forwarding of the change name plus `--fast-track` in both token orders, and Continue-now dispatch through the existing implementation-worker binding with a fresh lifecycle namespace. The envelope-forwarding test SHALL verify the complete opaque `arguments_value` request without extracting a name from a transcript or label or constructing an additional envelope field. Before routed wrappers are activated, Claude Code and opencode SHALL each be smoke-tested for design-worker dispatch, mandatory nested source-research dispatch, input relay, nonterminal notice relay, continuation, complete changed-file reporting, fresh-worker reconstruction with opaque input history and pending feedback, and the explicit resolved-change implementation handoff without design-state leakage. These routed-binding tests SHALL NOT be applied to Copilot's inline path. A failed required probe SHALL block activation rather than weaken delegation or persistence rules.

#### Scenario: opencode permission probe runs
- **WHEN** the opencode routed definitions are ready for activation
- **THEN** a live probe SHALL verify coordinator question access, coordinator task restriction to both named planning workers, design-worker `explore` dispatch, returned-task-ID continuation, reconstruction with interaction history, and explicit-envelope implementation-worker dispatch under restrictive top-level permissions

#### Scenario: Claude routed smoke runs
- **WHEN** the Claude routed definitions are ready for activation
- **THEN** a live smoke SHALL verify low-effort coordinator isolation, high-effort design-worker dispatch, budget-explorer source discovery, agent-ID continuation, reconstruction with interaction history, and explicit-envelope implementation-worker dispatch

#### Scenario: opencode forwards envelope values in either token order
- **WHEN** opencode invokes routed design with `arguments_value` containing `change-name --fast-track` or `--fast-track change-name`
- **THEN** the coordinator forwards the exact two-key invocation envelope, the downstream parser removes `--fast-track` from `arguments_value` before picking, and no transcript or label extraction is required

### Requirement: Copilot preserves the inline compatibility path
The GitHub Copilot `/sai-2-design` wrapper SHALL retain the existing inline design workflow and observable behavior. Documentation SHALL state precisely that supported Copilot surfaces do not expose one portable harness-owned contract for capturing a worker identifier and continuing that same worker across coordinator turns; it SHALL NOT claim that Copilot lacks subagent support.

#### Scenario: Copilot runs design
- **WHEN** `/sai-2-design` is invoked in GitHub Copilot
- **THEN** the existing inline path SHALL execute without requiring the routed coordinator, design worker definition, or lifecycle continuation binding

### Requirement: Design binding definitions are ownership-aware
Design coordinator and worker identifiers SHALL be SAI-namespaced. Installation SHALL create absent managed definitions. For Claude worker definitions, installation SHALL reuse exact-compatible pre-existing definitions without adopting ownership, overwrite the body and non-tunable frontmatter on subsequent installs while preserving the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emit a console notice when a body overwrite occurs; installation SHALL NOT block on incompatible collisions because the new strategy is overwrite-with-notice. Edited managed agents SHALL be preserved during guarded uninstall, and the installer SHALL overwrite the body and non-tunable frontmatter on subsequent installs (so an editor who keeps their tunables will see their customizations preserved as the values the installer does not touch). For opencode definitions, the projected `sai-2-design-worker.md` agent file SHALL follow the same `tunable-seed` lifecycle: created when absent with the canonical GLM 5.2 high-reasoning definition, overwritten (body and non-tunable frontmatter) on subsequent installs while preserving the destination's `model` and `variant` values placed per the structural anchor, and emitting a console notice when a body overwrite occurs; installation SHALL NOT block on incompatible collisions. Doctor SHALL validate the projected opencode agent file against its bundled source by comparing only the body and non-tunable frontmatter, reporting a missing file as an error with re-install remediation, a body-or-non-tunable-frontmatter divergence as an error naming the file, and a compatible file as valid. When `/sai-2-design` dispatches an existing user-edited worker agent file, that file's configured model, variant, mode, and permissions SHALL govern the worker invocation because the installer preserves the destination's tunable values on overwrite; the canonical GLM 5.2 default SHALL apply only to a file created because it was absent. Opencode uninstall SHALL remove the projected agent file only when its body and non-tunable frontmatter match the source, SHALL preserve a body-divergent file as a project-local override, and SHALL leave the opencode configuration untouched.

#### Scenario: Compatible user-owned Claude worker exists
- **WHEN** installation finds an exact-compatible `sai-design-planning-worker` definition
- **THEN** installation SHALL reuse it without modifying it and uninstall SHALL preserve it

#### Scenario: Body-divergent Claude worker is overwritten with notice
- **WHEN** installation finds a Claude agent file at a design coordinator or worker identifier whose body or non-tunable frontmatter differs from the managed definition
- **THEN** installation SHALL overwrite the body and non-tunable frontmatter, preserve the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emit a console notice naming the destination path
- **AND** SHALL NOT block installation

#### Scenario: Tuned opencode design agent file preserves its tunables
- **WHEN** installation finds an existing `sai-2-design-worker.md` agent file whose body and non-tunable frontmatter match the source but whose `model` or `variant` differs
- **THEN** installation SHALL overwrite the body and non-tunable frontmatter with the source bytes while leaving the destination's tunable lines untouched
- **AND** SHALL NOT emit a console notice for that destination

#### Scenario: Customized design worker runtime is honored
- **WHEN** `/sai-2-design` dispatches an existing user-owned `sai-2-design-worker.md` agent file with a customized model or variant
- **THEN** the invocation SHALL use that existing worker configuration without requiring the canonical GLM 5.2 default

#### Scenario: Missing opencode design worker agent file
- **WHEN** the `sai-2-design-worker.md` agent file is absent
- **THEN** installation SHALL create it with the canonical GLM 5.2 high-reasoning managed definition
- **AND** SHALL NOT create a `.<basename>.owner.json` sidecar

#### Scenario: Edited managed Claude agent survives uninstall
- **WHEN** uninstall finds a Claude worker whose body or non-tunable frontmatter differs from source
- **THEN** uninstall SHALL preserve the worker definition
- **AND** SHALL NOT consult any sidecar file

### Requirement: opencode design permission verification covers the SAI directory

The routed OpenCode design-binding activation checks SHALL verify that the active OpenCode configuration grants external-directory access to the narrow SAI global prompt path `~/.config/opencode/sai/**`. The resulting configuration assertion SHALL be owned by the OpenCode installer integration tests in `test/install-opencode.test.js`. Runtime no-additional-prompt behavior SHALL be a documented manual verification in the `Post-install` section of `INSTALL.opencode.md`, not an assumption about a non-existent automated live probe. The check SHALL reject a configuration that relies only on `permission.read`, and SHALL NOT require or recommend a wildcard trust rule for all external directories.

#### Scenario: OpenCode design permission verification verifies the SAI path
- **WHEN** the installer integration test and documented post-install verification are performed
- **THEN** the installer test SHALL verify that `permission.external_directory` allows `~/.config/opencode/sai/**`
- **AND** the documented manual verification SHALL instruct the user to invoke an SAI command after installation and confirm that reading its SAI prompt or binding does not produce an external-directory permission request

#### Scenario: Read-only permission does not satisfy verification
- **WHEN** an OpenCode configuration contains a matching `permission.read` rule but no matching `permission.external_directory` rule
- **THEN** the installer test or documented post-install verification SHALL fail
- **AND** it SHALL report the missing external-directory permission rather than treating read access as sufficient

#### Scenario: Broad external-directory permission is not required
- **WHEN** the routed design binding is validated
- **THEN** the validation SHALL accept the narrow SAI path rule
- **AND** it SHALL NOT require a rule that allows every external directory
