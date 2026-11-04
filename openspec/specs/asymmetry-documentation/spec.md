# asymmetry-documentation Specification

## Purpose
Documents how harness-specific enforcement gaps and observed runtime states are recorded in `AGENTS.md` so asymmetries between Claude Code and opencode stay explicit rather than silent.

## Requirements

### Requirement: AGENTS.md records what the command frontmatter does and does not enforce

`AGENTS.md` SHALL document that `sai-explore`'s explore-mode "No file writes" boundary lives in `sai/commands/explore/instructions.md`, that Claude Code's command `allowed-tools` pre-approves selected tools but does not remove unlisted tools, and that neither harness's mechanism alone enforces read-only command execution, so the contract boundary and the delegated-write authorization gates stay in force on both.

#### Scenario: Enforcement is discoverable in AGENTS.md

- **WHEN** a reader consults `AGENTS.md` about `sai-explore`
- **THEN** it states that Claude Code's `allowed-tools` pre-approves selected tools without removing unlisted ones
- **AND** it ties the read-only boundary to the "No file writes" rule of `sai/commands/explore/instructions.md`

### Requirement: AGENTS.md records the opencode gap and its rationale

`AGENTS.md` SHALL document that opencode has no per-command tool-restriction frontmatter field, that the opencode `sai-explore` wrapper is therefore intentionally left unchanged, and that model discipline is the accepted fallback there. The documentation SHALL state why the alternative (routing to a read-only sub-agent) was rejected: it breaks the main-session interactivity `sai-explore` requires.

#### Scenario: The asymmetry is explicit, not silent

- **WHEN** a reader consults `AGENTS.md` about why the opencode `sai-explore` wrapper differs from the Claude Code wrapper
- **THEN** it explains that opencode's command frontmatter has no tool-restriction field
- **AND** it states that the opencode wrapper is deliberately unchanged with model discipline as the fallback
- **AND** it records that the read-only sub-agent alternative was rejected for breaking main-session interactivity

### Requirement: The opencode sai-explore wrapper is left unchanged

This change SHALL NOT modify `commands/opencode/sai-explore.md`. The opencode wrapper's behavior stays governed by model discipline, consistent with the documented gap.

#### Scenario: opencode wrapper is untouched by this change

- **WHEN** the diff for this change is reviewed
- **THEN** `commands/opencode/sai-explore.md` has no modifications

### Requirement: AGENTS.md records the observed stall-watchdog state on either harness

`AGENTS.md` SHALL document that the `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` environment variable is unset in this project's configuration and is not active by default; a probe in this session with the variable unset ran for roughly 600 seconds of complete silence without triggering termination. `AGENTS.md` SHALL also state that opencode exposes no equivalent mechanism. `AGENTS.md` SHALL record the configured case (a non-zero value of `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` set explicitly) as an open question: the behaviour under that configuration was not probed by this change. `AGENTS.md` SHALL further state that no design or task in this change may depend on a stall watchdog firing in its current default-off configuration; this rule does NOT preclude future designs from probing or activating the configured case.

#### Scenario: The observed state is discoverable in AGENTS.md

- **WHEN** a reader consults `AGENTS.md` about agent-level time bounds
- **THEN** it states that `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` is unset in this project's configuration
- **AND** it names the empirical observation that a probe with the variable unset ran for roughly 600 seconds of complete silence without triggering termination
- **AND** it states that opencode exposes no equivalent mechanism
- **AND** it records the configured case (a non-zero value of `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` set explicitly) as an open question that this change did not probe

#### Scenario: No design in this change depends on a stall watchdog firing by default

- **WHEN** a reader consults `AGENTS.md` about design constraints for this change
- **THEN** it states that no design or task in this change may depend on a stall watchdog firing in its current default-off configuration
- **AND** the rule is explicitly scoped to "this change" and to "default-off configuration", not to the future possibility of an activated watchdog

#### Scenario: Containment is the only layer this change adopts

- **WHEN** a reader consults `AGENTS.md` about the budget-subagent hang-resilience change
- **THEN** it states that the only containment layer is background dispatch on both harnesses, Claude Code through `Agent(run_in_background: true)` and opencode through the v2 `subagent` tool with `background: true`, which keeps a hung child reachable for reaping but does not terminate it automatically
- **AND** it states that no wall-clock bound is assumed to fire
- **AND** it states that opencode v1 `task` dispatch is retired and that neither harness cancels a hung child automatically
