## MODIFIED Requirements

### Requirement: Claude Code uses separate low-effort coordinator and high-effort worker bindings
The Claude Code design wrapper SHALL use the staged routed coordinator model and effort declaration, while the design worker SHALL retain its separate technical-worker binding and harness-native continuation. The coordinator SHALL permit only `Skill`, `Agent`, `SendMessage`, and `AskUserQuestion`; file, search, shell, web, git, and OpenSpec tools SHALL be unavailable to it. It SHALL load the design-worker binding and SHALL NOT load the implementation-worker binding, because `/sai-2-design` no longer dispatches the implementation worker. The SAI-namespaced design worker definition SHALL retain its separate technical-worker model and effort with `Read`, `Glob`, `Grep`, `Bash`, `Edit`, `Write`, `Agent`, and `Skill` access, including the Claude budget-explorer binding required for source discovery. Its binding SHALL capture the dispatched agent ID and use harness-native continuation for later answers and feedback.

#### Scenario: Claude Code dispatches design work
- **WHEN** `/sai-2-design` starts in Claude Code
- **THEN** the low-effort coordinator SHALL dispatch the numbered design worker, capture its agent ID outside the worker payload, and continue that agent for later `needs_input` answers

#### Scenario: staged-wrapper-model-is-used
- **WHEN** the Claude Code design wrapper and worker binding are inspected
- **THEN** the wrapper's staged coordinator model and effort are preserved separately from the worker's technical I/O and continuation contract.

### Requirement: opencode uses high-reasoning GLM 5.2 for both roles
The opencode design wrapper and worker projection SHALL use the staged opencode coordinator and worker declarations, with the wrapper's declared model and variant remaining the source of coordinator routing and the projected worker retaining its binding-owned task continuation. The canonical projected opencode design-worker agent file SHALL define the numbered design worker as a subagent with technical I/O permissions and `permission.task` denying all targets before allowing `explore` for mandatory source discovery; the definition SHALL live in the frontmatter of the manifest-projected `agents/opencode/sai-2-design-worker.md` file rather than in the opencode configuration agent map. SAI SHALL neither install a coordinator agent entry nor select one from a wrapper — a user-defined primary agent is outside this constraint. Its native `question` capability and its `task` dispatch to `sai-2-design-worker` SHALL be preconditions on the active primary agent per `opencode-coordinator-runtime`, not permissions supplied by shipped configuration. The wrapper SHALL load only the design-worker binding. The design-worker binding SHALL capture and continue the harness task ID outside the worker-authored payload.

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

#### Scenario: opencode-routed-model-is-declared
- **WHEN** the opencode design wrapper and projected worker are inspected
- **THEN** their staged model, variant, worker-routing, and continuation declarations remain consistent with the active projection.

