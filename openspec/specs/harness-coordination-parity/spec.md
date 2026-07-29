# Harness Coordination Parity Specification

## Purpose
Define the shared phase boundary and harness-local dispatch mechanisms for routed and inline SAI workflows.

## Requirements

Routed coordinator and invocation bodies are grouped under `sai/commands/{design,implement}/`, while GitHub Copilot uses `sai/orchestration/inline-invocation.md`.

### Requirement: All three harnesses share the same sai-2 phase boundary

Claude Code, opencode, and GitHub Copilot SHALL each end `/sai-2-design` at the same point — after design-artifact completion and the artifact-feedback gate — and SHALL each emit the same design completion stop. No harness SHALL retain a same-prompt path into implementation planning.

#### Scenario: Claude Code stops after design

- **WHEN** routed `/sai-2-design` completes under Claude Code
- **THEN** it SHALL emit the design completion stop and SHALL NOT dispatch the implementation-planning worker

#### Scenario: opencode stops after design

- **WHEN** routed `/sai-2-design` completes under opencode
- **THEN** it SHALL emit the design completion stop and SHALL NOT dispatch the implementation-planning worker

#### Scenario: Copilot inline stops after design

- **WHEN** the Copilot inline design path completes
- **THEN** it SHALL emit the design completion stop and SHALL NOT enter its inline implementation branch

### Requirement: Harness-specific dispatch mechanisms are retained

Each harness SHALL keep its own mechanism for reaching the technical worker within a phase: Claude Code's `Agent` dispatch with `SendMessage` continuation, opencode's `task` dispatch with task-ID continuation, and Copilot's inline execution path. Parity SHALL apply to the phase boundary and the user-visible completion behavior, not to the execution mechanism.

#### Scenario: routed harnesses keep binding-owned continuation

- **WHEN** a design or implementation worker returns `needs_input` on Claude Code or opencode
- **THEN** the harness binding SHALL continue the same worker through its established harness-native continuation, unchanged by this change

#### Scenario: Copilot keeps its inline path

- **WHEN** a Copilot design or implementation command runs
- **THEN** it SHALL continue to execute inline rather than through the routed coordinator-worker bindings

### Requirement: Coordinator runtime selection is harness-local

Each harness SHALL select the logical coordinator's runtime through its own wrapper metadata. Claude Code SHALL retain its wrapper-session coordinator model and effort settings, opencode SHALL declare `opencode-go/glm-5.2` with `variant: high` in its wrapper frontmatter, and Copilot SHALL retain its inline model selection. No shared cross-harness coordinator agent identity SHALL be required.

#### Scenario: Claude coordinator settings unchanged

- **WHEN** `commands/claude/sai-2-design.md` and `commands/claude/sai-3-implement.md` are read
- **THEN** their coordinator model and effort frontmatter SHALL be unchanged by this change

#### Scenario: opencode coordinator settings come from the wrapper

- **WHEN** an opencode routed SAI phase command starts
- **THEN** its coordinator runtime SHALL come from the wrapper frontmatter and SHALL NOT depend on a configured agent profile
