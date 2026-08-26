## MODIFIED Requirements

### Requirement: Scope the overview-language gate to supervised Auto activation

`sai-explore` SHALL evaluate overview-language gate 9 only after deterministic selection confirms a dispatchable change for the displayed `Auto (sai-1 + sai-2)` route and before setting `active_change` or dispatching the first spec worker. The gate MUST NOT run during crystallization emission, free-form exploration, Manual selection, Auto (fast implementation), cancellation, empty or completed selection sets, or an already-active supervised run.

#### Scenario: Gate 9 runs only for dispatchable Auto

- **WHEN** deterministic selection confirms one uncompleted change for the displayed `Auto (sai-1 + sai-2)` route
- **THEN** gate 9 runs before the first spec-worker dispatch and does not run during crystallization emission

### Requirement: Preserve explicit and fast-track resolution

An explicit `--overview-lang <language>` value SHALL suppress gate 9 and become the selected conversation-only language. When fast-track is active without that option, the overview language MUST resolve to `None` without asking. Auto (fast implementation) SHALL treat the explicit option as a documented no-op.

#### Scenario: Explicit and fast-track values resolve without asking

- **WHEN** supervised Auto receives either an explicit language or fast-track without one
- **THEN** it uses the explicit language or `None` respectively without presenting gate 9

### Requirement: Keep the selected language chat-scoped

The resolved language SHALL remain conversation-only for the crystallized idea or slice set, survive a failed or cancelled supervised attempt for retry, reset for a materially new idea, and never be persisted to an artifact or configuration. An emitted block SHALL carry only an explicit option value or `None`.

#### Scenario: Retry reuses the language without retro-editing

- **WHEN** a later supervised retry targets the same crystallized idea after gate 9 resolved
- **THEN** the retry reuses the stored value and previously emitted blocks remain unchanged
