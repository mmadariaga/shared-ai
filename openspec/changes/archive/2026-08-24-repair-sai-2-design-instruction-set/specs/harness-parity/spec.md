## MODIFIED Requirements

### Requirement: Expose equivalent wrapper behavior
The Claude Code and opencode `sai-explore` and `sai-2-design` wrappers SHALL document and transport the same optional `--overview-lang <language>` flag. Parity documentation SHALL cover the four wrapper argument hints and forwarding surfaces plus the shared `sai/commands/explore/body.md` and `sai/commands/design/coordinator.md` flag and envelope contracts. Claude Code argument handling and opencode argument forwarding SHALL both reach the shared parsing and worker contracts without changing the language of normative artifacts. When the flag is absent, both harnesses SHALL preserve the unresolved/no-generation behavior rather than synthesizing English.

#### Scenario: Both harnesses select the same language
- **WHEN** equivalent Claude Code and opencode invocations supply `--overview-lang spanish`
- **THEN** both resolve the same cleaned change arguments, effective language, fast-track state, and overview-generation request

#### Scenario: Both harnesses omit generation identically
- **WHEN** equivalent invocations omit `--overview-lang`
- **THEN** both leave the effective language unresolved and skip overview generation while preserving the existing wrapper and worker lifecycle

#### Scenario: both-harness-opt-in-is-equivalent
- **WHEN** equivalent Claude Code and opencode invocations supply `--overview-lang spanish`
- **THEN** both resolve the same cleaned arguments, effective language, and overview-generation request.

## REMOVED Requirements

### Requirement: Both harnesses default identically
**Reason:** Both harnesses no longer default omitted-language generation to English.
**Migration:** Both harnesses use the unresolved/no-generation path until an explicit language is selected.
#### Scenario: both-harness-omission-skips-generation
- **WHEN** equivalent invocations omit `--overview-lang`
- **THEN** both skip overview generation instead of defaulting to English.

