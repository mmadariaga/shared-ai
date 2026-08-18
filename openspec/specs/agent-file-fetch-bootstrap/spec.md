# agent-file-fetch-bootstrap Specification

## Purpose

TBD - created by syncing change include-fetch-skill-in-budget-agents.

## Requirements

### Requirement: Harness-specific managed-agent fetch bootstrap

All Claude Code managed agent projections MUST begin their post-frontmatter body with `Fetch @skills/fetch/SKILL.md`, and all opencode managed agent projections MUST begin their post-frontmatter body with `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` before any canonical policy or worker-contract Fetch directive.

#### Scenario: Projected agent begins with the harness bootstrap
- **WHEN** the installer projects any of the 20 managed agents for Claude Code or opencode
- **THEN** the first post-frontmatter body line is the corresponding harness-specific fetch-skill directive and the canonical fetch follows it
