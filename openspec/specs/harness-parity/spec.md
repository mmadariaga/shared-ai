# harness-parity Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

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

### Requirement: Report malformed input consistently

Both harnesses SHALL reject a missing language value with a clear validation error before change-name resolution or overview dispatch, and SHALL preserve equivalent `--fast-track` behavior for valid flag orderings.

#### Scenario: Missing values fail in both harnesses

- **WHEN** either harness receives `--overview-lang` without a value or immediately followed by another option
- **THEN** it reports the same validation outcome and performs no overview dispatch

#### Scenario: Flag order remains equivalent in both harnesses

- **WHEN** either harness receives `--overview-lang spanish --fast-track` or `--fast-track --overview-lang spanish`
- **THEN** it keeps fast-track active and produces the same cleaned arguments and selected language for the design worker

#### Scenario: Documentation surfaces are covered by parity checks

- **WHEN** the contract suite checks overview-language support
- **THEN** it asserts equivalent flag documentation in both harness wrapper pairs and in the named shared command/coordinator contracts
