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
