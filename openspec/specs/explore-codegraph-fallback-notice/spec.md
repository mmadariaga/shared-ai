# explore-codegraph-fallback-notice Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: One-time research-tooling check at explore session start

Explore SHALL NOT perform a main-session research-tooling availability probe at startup or before delegated discovery. Explorer-owned detection and per-segment diagnostics SHALL remain the sole availability signal. Consumers SHALL render only eligible explorer-reported absences under the shared notice rule; no startup state notice SHALL be inferred independently.

#### Scenario: check fires once before any code search
- **WHEN** an Explore session begins
- **THEN** the principal performs no research-tooling probe or startup state notice and delegates discovery directly

#### Scenario: check does not fire again later in the same session
- **WHEN** the same Explore session continues
- **THEN** the principal runs no independent probe and presents notices only for eligible diagnostics in returned research results

#### Scenario: check never blocks the session
- **WHEN** startup research availability would otherwise be checked
- **THEN** no independent check runs and eligible absence notices remain informational rather than a halt

#### Scenario: other sai commands are unaffected
- **WHEN** another SAI command runs
- **THEN** it gains no Explore startup availability probe, while Design applies the shared eligible-notice rule when consuming explorer results

#### Scenario: check runs after prereqs pass and before first research
- **WHEN** Explore prerequisites pass
- **THEN** the principal runs no research-availability script probe before behavior loading and delegates discovery without a startup state literal

### Requirement: Read-only detection via tool presence and Glob

The principal SHALL NOT determine research availability through a filesystem probe, caller-supplied mcp-present flag, or Glob. Detection SHALL remain in the explorer's session and shall not mutate the project. The consumer MAY render eligible diagnostics returned by the explorer but SHALL NOT independently infer a notice from index contents.

#### Scenario: detection uses only read-only probes
- **WHEN** research-tooling state is evaluated
- **THEN** detection remains explorer-owned without principal availability evaluation or file writes

#### Scenario: harness-namespaced tool names are recognized
- **WHEN** CodeGraph MCP uses a harness namespace
- **THEN** the explorer recognizes its granted access in its own session and the principal computes no availability flag

#### Scenario: a root entry other than the sentinel is evidence
- **WHEN** the explorer encounters root index evidence such as codegraph.db
- **THEN** only the explorer evaluates it and the principal infers no state notice independently

#### Scenario: a sentinel-only directory is not evidence
- **WHEN** explorer-observed root results contain only the index sentinel
- **THEN** the explorer may report applicable index absence with remediation and the consumer applies the shared eligibility filter rather than probing independently

#### Scenario: a nested-only directory is not evidence
- **WHEN** an index exists only below another directory and no usable root index is established
- **THEN** the explorer owns that assessment and the principal performs no independent check

#### Scenario: binary probe and explicit MCP flag decide installed state
- **WHEN** tooling outside the live Explore route accepts binary evidence or an explicit MCP flag
- **THEN** the Explore principal produces no caller-supplied availability flag and performs no script-side MCP inference

### Requirement: Three-state detection with matching notice

The principal SHALL NOT restore the retired three-state classification or its not-installed, no-index, and ready literals. Availability SHALL remain explorer-owned. Explore and Design MAY present eligible unavailable diagnostics through the shared Research tool unavailable format, including concrete remediation, without a separate principal probe.

#### Scenario: no code-graph tools present
- **WHEN** the explorer establishes that granted applicable CodeGraph tools are absent
- **THEN** the consumer may present eligible absence guidance without printing a retired state literal or running an independent probe

#### Scenario: code-graph tools present but no index
- **WHEN** the explorer establishes applicable project-index absence
- **THEN** the consumer may present reported codegraph init guidance without initializing the index or probing independently

#### Scenario: code-graph tools and index both present
- **WHEN** the explorer has usable granted tools and index access
- **THEN** the consumer prints no ready-state notice

### Requirement: Notice is always English

The retired English-only three-state notice SHALL NOT be restored. Eligible notices SHALL preserve the shared required format and the explorer's reason and concrete remediation under the applicable communication policy. Other diagnostics SHALL remain internal.

#### Scenario: non-English session still gets an English notice
- **WHEN** the conversation is not English and an eligible absence is reported
- **THEN** the consumer preserves the required shared notice format without reviving the retired English-only state notice

### Requirement: Notice is visually emphasized

Eligible missing-tool notices SHALL use the shared informational blockquote format. The retired startup-check bold leads, ready-state callouts, and warning markers SHALL NOT be restored. These notices SHALL gate nothing.

#### Scenario: fallback notice is emphasized
- **WHEN** an eligible environmental absence is presented
- **THEN** it uses the shared informational blockquote rather than the retired three-state warning

#### Scenario: ready notice is emphasized
- **WHEN** research tools and index are usable
- **THEN** no ready-state notice or callout is rendered

#### Scenario: ready JSON literal carries no warning marker
- **WHEN** tooling outside the live route emits ready JSON state
- **THEN** the Explore path does not render that state as a ready notice or warning marker

### Requirement: Generic preference with CodeGraph-specific recommendation

Tool preference SHALL remain explorer-owned through its profile-aware ladder. Consumers MAY present concrete remediation from eligible explorer diagnostics: configuring or reconnecting CodeGraph MCP, installing the CLI and adding it to PATH, or initializing an absent applicable project index. They SHALL NOT independently invent an availability recommendation, and the explorer SHALL NOT initialize the index itself.

#### Scenario: recommendation names CodeGraph
- **WHEN** an eligible explorer-reported absence supplies CodeGraph installation or index-initialization guidance
- **THEN** the consumer presents that guidance without assuming tool selection or performing installation or initialization

#### Scenario: check does not duplicate global prefer-codegraph guidance
- **WHEN** usable CodeGraph access already exists and global guidance prefers it
- **THEN** the consumer prints no ready-state notice or redundant recommendation
