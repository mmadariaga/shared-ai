# Opencode Coordinator Runtime Specification

## Purpose
Define the wrapper-declared runtime and invoking-agent prerequisites for routed opencode phases.

## Requirements

### Requirement: Opencode wrappers declare the coordinator runtime

The opencode `/sai-2-design` and `/sai-3-implement` wrappers SHALL declare the logical coordinator's runtime in their own frontmatter: `model: opencode-go/glm-5.2` and `variant: high`. Neither wrapper SHALL declare an `agent:` field. Both wrappers SHALL retain `subtask: false`. Because `variant: high` is not the platform default, it SHALL be stated explicitly and SHALL NOT be omitted under the wrapper default-variant omission rule.

#### Scenario: opencode design wrapper carries its coordinator runtime

- **WHEN** `commands/opencode/sai-2-design.md` frontmatter is read
- **THEN** it SHALL contain `model: opencode-go/glm-5.2`, `variant: high`, and `subtask: false`, and SHALL contain no `agent:` field

#### Scenario: opencode implement wrapper carries its coordinator runtime

- **WHEN** `commands/opencode/sai-3-implement.md` frontmatter is read
- **THEN** it SHALL contain `model: opencode-go/glm-5.2`, `variant: high`, and `subtask: false`, and SHALL contain no `agent:` field

### Requirement: The invoking primary agent must supply task dispatch and native questions

Opencode's command `agent` field, when omitted, defaults to the session's **currently selected primary agent** — not to a fixed built-in agent. Because the wrappers declare no `agent:` field, the logical coordinator SHALL run under whichever primary agent the user has active (`build` unless they switched with the `switch_agent` keybind).

The routed phases SHALL therefore require the active primary agent to permit native `question` and `task` dispatch to the numbered SAI workers. This is a hard prerequisite, not a shipped guarantee: it SHALL be stated as an accepted consequence of removing the profile, SHALL be documented as a prerequisite of the invoking agent, and its remediation SHALL be to switch to a primary agent that permits both — never to reintroduce a managed coordinator profile.

#### Scenario: default build agent satisfies the prerequisite

- **WHEN** an opencode routed SAI phase command runs under the stock `build` primary agent with the canonical configuration
- **THEN** the coordinator SHALL present `needs_input` questions and the artifact-feedback gate through the native picker and SHALL dispatch its numbered worker, because neither `build` nor the canonical top-level configuration denies `question` or `task`

#### Scenario: active primary agent denies a required capability

- **WHEN** an opencode routed SAI phase command runs under a primary agent that denies native `question` or denies `task` dispatch to the numbered worker
- **THEN** the phase SHALL be documented as unusable under that agent, and the documented remediation SHALL be to switch the active primary agent to one that permits both

#### Scenario: a restrictive agent is switched into mid-session

- **WHEN** the user switches the active primary agent before invoking a routed SAI phase command
- **THEN** the newly selected agent's permissions SHALL govern that invocation, and the wrapper's declared model and variant SHALL still apply

### Requirement: No dedicated opencode coordinator agent profile exists

The canonical opencode configuration sample and the installer's managed opencode agent projection SHALL NOT define any primary coordinator agent for the SAI workflow, and no SAI wrapper SHALL select one. This governs what SAI ships and selects; a primary agent the user defines or activates themselves is outside its scope. The managed opencode agent set SHALL consist of exactly the subagent worker entries `sai-2-design-worker` and `sai-3-implementation-worker` alongside the pre-existing low-cost helper agents. No SAI-managed enumerated worker task-allowlist for a coordinator SHALL be installed, configured, or verified. This does not remove the active primary agent's own permissions from the picture; those are governed by the preceding requirement.

#### Scenario: config sample has no coordinator entry

- **WHEN** `configs/opencode.jsonc` is read
- **THEN** its `agent` block SHALL contain no `sai-coordinator` entry and no other SAI primary coordinator entry

#### Scenario: installer projects only worker agents

- **WHEN** the installer's managed opencode agent map is enumerated
- **THEN** it SHALL contain `sai-2-design-worker` and `sai-3-implementation-worker` and SHALL contain no coordinator key

#### Scenario: adding a worker requires no SAI-managed allowlist edit

- **WHEN** a new numbered SAI worker is introduced in a future change
- **THEN** no SAI-managed coordinator permission allowlist SHALL require updating for that worker to be dispatchable
- **AND** any remaining dispatch restriction SHALL come from the user's own active primary agent, not from a shipped SAI profile

### Requirement: Worker dispatch depth and worker runtime are unaffected

Removing the coordinator profile SHALL NOT change `subagent_depth`, which lives at the top level of the opencode configuration, and SHALL NOT change any worker's model, variant, mode, or permission fields. Worker model and effort configuration SHALL continue to live in the worker profiles and harness bindings.

#### Scenario: subagent depth survives profile removal

- **WHEN** `configs/opencode.jsonc` is read after the coordinator entry is removed
- **THEN** the top-level `subagent_depth` value SHALL remain `2`

#### Scenario: worker entries are byte-equivalent

- **WHEN** the managed `sai-2-design-worker` and `sai-3-implementation-worker` opencode entries are compared before and after this change
- **THEN** their model, variant, mode, and permission fields SHALL be unchanged
