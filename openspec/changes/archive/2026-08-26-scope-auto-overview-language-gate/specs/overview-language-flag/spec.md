## MODIFIED Requirements

### Requirement: Resolve omitted overview language at the consuming route

An omitted `--overview-lang` value SHALL remain unresolved during crystallization and SHALL be resolved as `None` by fast-track or by a noncommittal/declined supervised Auto gate. An explicit value SHALL suppress the gate and remain the sole language opt-in.

#### Scenario: Omission remains neutral until consumption

- **WHEN** a crystallization turn emits without an explicit overview-language option
- **THEN** the emitted block records `None` and supervised Auto later resolves the omitted value according to its suppression rules

### Requirement: Preserve design invocation syntax

The supported `sai-2-design` example SHALL show the change name followed by `--fast-track --overview-lang Lang`, while flag-order validation and explicit-value requirements remain unchanged.

#### Scenario: Combined design flags are documented

- **WHEN** the spec completion guidance recommends the next design command
- **THEN** it includes both `--fast-track` and `--overview-lang Lang` after the change name
