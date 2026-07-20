## ADDED Requirements

### Requirement: AGENTS.md records the frontmatter enforcement in two harnesses

`AGENTS.md` SHALL document that `sai-explore`'s explore-mode read-only guarantee is enforced through per-command frontmatter in Claude Code (`allowed-tools`) and GitHub Copilot (`tools:`), promoting the `explore.md` "No file writes" rule from a model-discipline convention to an enforced constraint in those two harnesses.

#### Scenario: Enforcement is discoverable in AGENTS.md

- **WHEN** a reader consults `AGENTS.md` about `sai-explore`
- **THEN** it states that the read-only guarantee is enforced via `allowed-tools` in Claude Code and via `tools:` in Copilot
- **AND** it ties this to the `explore.md` "No file writes" guarantee

### Requirement: AGENTS.md records the opencode gap and its rationale

`AGENTS.md` SHALL document that opencode has no per-command tool-restriction frontmatter field, that the opencode `sai-explore` wrapper is therefore intentionally left unchanged, and that model discipline is the accepted fallback there. The documentation SHALL state why the alternative (routing to a read-only sub-agent) was rejected: it breaks the main-session interactivity `sai-explore` requires.

#### Scenario: The asymmetry is explicit, not silent

- **WHEN** a reader consults `AGENTS.md` about why the opencode `sai-explore` wrapper differs from the Claude Code and Copilot wrappers
- **THEN** it explains that opencode's command frontmatter has no tool-restriction field
- **AND** it states that the opencode wrapper is deliberately unchanged with model discipline as the fallback
- **AND** it records that the read-only sub-agent alternative was rejected for breaking main-session interactivity

### Requirement: The opencode sai-explore wrapper is left unchanged

This change SHALL NOT modify `commands/opencode/sai-explore.md`. The opencode wrapper's behavior stays governed by model discipline, consistent with the documented gap.

#### Scenario: opencode wrapper is untouched by this change

- **WHEN** the diff for this change is reviewed
- **THEN** `commands/opencode/sai-explore.md` has no modifications
