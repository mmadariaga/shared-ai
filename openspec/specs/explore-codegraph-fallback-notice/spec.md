# explore-codegraph-fallback-notice Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: One-time research-tooling check at explore session start
`sai-explore` SHALL NOT perform any main-session research-tooling availability check; no probe SHALL run at session start and no notice SHALL be printed before code search. Explorer-owned detection plus per-segment discards SHALL be the only signal.

#### Scenario: check fires once before any code search
- **WHEN** a `sai-explore` session begins
- **THEN** the agent performs no research-tooling check and prints no notice, delegating discovery directly

#### Scenario: check does not fire again later in the same session
- **WHEN** the same `sai-explore` session continues with further turns after the initial notice
- **THEN** the agent still performs no research-tooling check and reprints no notice

#### Scenario: check never blocks the session
- **WHEN** the research-tooling check runs
- **THEN** no check runs, so the session proceeds by delegation with no prompt and no halt

#### Scenario: other sai commands are unaffected
- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no research-tooling notice is printed

#### Scenario: check runs after prereqs pass and before first research
- **WHEN** prereqs pass in a `sai-explore` session
- **THEN** the agent runs no script probe before the `## Behaviors` loads and prints no literal, delegating instead

### Requirement: Read-only detection via tool presence and Glob
The main session SHALL NOT determine research-tooling state via any filesystem probe, caller-supplied `--mcp-present` flag, or Glob; detection SHALL live only in the explorer in its own session.

#### Scenario: detection uses only read-only probes
- **WHEN** the agent evaluates the research-tooling state
- **THEN** the principal runs no evaluation and delegates without any file write or edit

#### Scenario: harness-namespaced tool names are recognized
- **WHEN** the code-graph MCP tools are exposed under a harness namespace such as `mcp__codegraph__*` rather than an unprefixed `codegraph_*`
- **THEN** only the explorer recognizes that presence in its own session; the principal computes no flag

#### Scenario: a root entry other than the sentinel is evidence
- **WHEN** the root-scoped `.codegraph` results include an entry such as `codegraph.db`
- **THEN** only the explorer treats that as index presence; the principal prints no notice

#### Scenario: a sentinel-only directory is not evidence
- **WHEN** the root-scoped results contain only `.gitignore`
- **THEN** only the explorer treats the index as absent; the principal prints no notice

#### Scenario: a nested-only directory is not evidence
- **WHEN** a `.codegraph` directory exists only below another project directory and the root-scoped results contain no non-sentinel entry
- **THEN** the nested directory determines nothing in the principal, which runs no check

#### Scenario: binary probe and explicit MCP flag decide installed state
- **WHEN** the script evaluates binary presence and the caller supplies explicit MCP presence
- **THEN** no caller-supplied flag is produced from the explore path and no script-side MCP inference occurs for explore

### Requirement: Three-state detection with matching notice
There SHALL be no main-session three-state classification and no main-session notice; the `not-installed`, `no-index`, and `ready` literals SHALL NOT be printed by the principal.

#### Scenario: no code-graph tools present
- **WHEN** the session has no code-graph MCP tools available
- **THEN** the principal prints no fallback notice and delegates instead

#### Scenario: code-graph tools present but no index
- **WHEN** code-graph MCP tools are present but the root-scoped directory `Glob` returns no entry other than `.gitignore`
- **THEN** the principal prints no fallback notice and delegates instead

#### Scenario: code-graph tools and index both present
- **WHEN** code-graph MCP tools are present and the root-scoped directory `Glob` returns an entry other than `.gitignore`
- **THEN** the principal prints no ready notice and delegates instead

### Requirement: Notice is always English
No research-tooling notice SHALL be printed by the main session in any language; the English-only literal rule for this notice SHALL be retired with the notice itself.

#### Scenario: non-English session still gets an English notice
- **WHEN** the `sai-explore` session's conversation language is not English
- **THEN** no research-tooling notice is printed in any language

### Requirement: Notice is visually emphasized
No research-tooling notice SHALL be rendered by the main session; no bold lead, blockquote callout, or warning marker SHALL be printed for this retired check.

#### Scenario: fallback notice is emphasized
- **WHEN** the check prints a fallback notice for the not-installed or installed-but-no-index state
- **THEN** no fallback notice is printed and no emphasis is rendered

#### Scenario: ready notice is emphasized
- **WHEN** the check prints the ready-state notice
- **THEN** no ready notice is printed and no callout is rendered

#### Scenario: ready JSON literal carries no warning marker
- **WHEN** the check emits the ready state with `--json`
- **THEN** no ready literal is emitted from the explore path

### Requirement: Generic preference with CodeGraph-specific recommendation
The main session SHALL NOT express install or init recommendations for CodeGraph; tool preference SHALL be decided inside the explorer via its ladder.

#### Scenario: recommendation names CodeGraph
- **WHEN** the notice recommends installing or initializing a code-graph tool
- **THEN** the principal prints no recommendation and delegates the decision to the explorer

#### Scenario: check does not duplicate global prefer-codegraph guidance
- **WHEN** a code-graph MCP is present and already injects prefer-codegraph-over-grep guidance into the harness's global memory
- **THEN** the principal restates nothing and prints no state notice
