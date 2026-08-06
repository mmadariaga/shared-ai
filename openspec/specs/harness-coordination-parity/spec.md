# Harness Coordination Parity Specification

## Purpose
Define the shared phase boundary and harness-local dispatch mechanisms for routed SAI workflows.

## Requirements

Routed coordinator and invocation bodies are grouped under `sai/commands/{design,implement}/`.

### Requirement: Routed harnesses share the same sai-2 phase boundary

Claude Code and opencode SHALL each end `/sai-2-design` after design-artifact completion and the artifact-feedback gate, and SHALL each emit the existing design completion stop. No surviving harness SHALL retain a same-prompt path into implementation planning.

#### Scenario: Claude Code stops after design

- **WHEN** routed `/sai-2-design` completes under Claude Code
- **THEN** it emits the existing design completion stop
- **AND** it does not dispatch implementation planning

#### Scenario: opencode stops after design

- **WHEN** routed `/sai-2-design` completes under opencode
- **THEN** it emits the existing design completion stop
- **AND** it does not dispatch implementation planning

### Requirement: Surviving harnesses use routed dispatch mechanisms

Claude Code SHALL retain Agent dispatch with SendMessage continuation and opencode SHALL retain task dispatch with task-ID continuation for their routed planning and audit workers. No inline execution mechanism or Copilot-specific dispatch branch SHALL remain in the supported harness contract.

#### Scenario: Routed worker requests input

- **WHEN** a design or implementation worker returns `needs_input` on Claude Code or opencode
- **THEN** its existing harness-native binding continues the same worker
- **AND** no inline adapter is selected

### Requirement: Coordinator runtime selection is limited to surviving harnesses

Claude Code SHALL retain its existing wrapper-session coordinator model and effort settings, and opencode SHALL retain its wrapper-declared `opencode-go/glm-5.2` high-reasoning runtime. No Copilot model selection or shared Copilot coordinator identity SHALL be required.

#### Scenario: Surviving wrappers retain runtime metadata

- **WHEN** the Claude Code or opencode routed phase wrappers are read
- **THEN** their existing coordinator runtime metadata is unchanged
- **AND** no Copilot wrapper metadata is required

### Requirement: Routed worker contracts have no inline exception

Claude Code and opencode SHALL continue to receive their canonical worker contracts through their existing installer-owned, harness-native bindings. The active parity contract SHALL not describe a Copilot inline path, Copilot registration exclusion, or inline worker substitute.

#### Scenario: Routed projections remain equivalent

- **WHEN** a Claude Code or opencode worker is installed and dispatched
- **THEN** it receives the existing canonical phase-worker contract and binding template
- **AND** its continuation and lifecycle behavior remain unchanged
