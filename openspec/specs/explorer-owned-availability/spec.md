# explorer-owned-availability Specification

## Purpose
TBD - created by archiving change mandate-explorer-research-delegation. Update Purpose after archive.

## Requirements

### Requirement: Explorer-owned CodeGraph detection
CodeGraph availability self-detection SHALL live only in the explorer, covering MCP presence including deferred tools, `codegraph` binary on PATH, shell availability, git availability, and repository status.

#### Scenario: Explorer chooses research tools
- **WHEN** the explorer starts a discovery lookup
- **THEN** it self-detects CodeGraph availability in its own session and applies its ladder

### Requirement: No main-session probe
The main session SHALL run no probe, SHALL print no literal, and SHALL compute no `--mcp-present`; per-segment `ladder_discards` SHALL be the only availability signal.

#### Scenario: Research completes a segment
- **WHEN** an explore subagent completes a research segment
- **THEN** its per-segment ladder_discards are surfaced as the sole availability signal

### Requirement: Claude allowlist trim
The Claude explore wrapper SHALL exclude the direct CodeGraph MCP tool and SHALL collapse per-file Node tool entries to per-root wildcards while retaining Read, Glob, Grep, WebFetch, and WebSearch under written discipline.

#### Scenario: Principal runs under Claude allowlist
- **WHEN** the principal researches under the Claude wrapper
- **THEN** direct CodeGraph calls are unavailable and Node tool access resolves via per-root wildcards

### Requirement: Harness parity with documented fallback
Delegation discipline SHALL be identical on Claude Code and opencode, with the allowlist as additional enforcement only on Claude; when the explorer is unavailable the principal MAY use punctual Glob, Grep, or Read without reintroducing any probe or literal and SHALL re-delegate as soon as possible.

#### Scenario: Explorer unavailable
- **WHEN** the explorer cannot be dispatched
- **THEN** the principal uses a punctual fallback read and re-delegates once the explorer is available
