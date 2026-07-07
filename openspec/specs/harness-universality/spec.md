## ADDED Requirements

### Requirement: Pipeline supports three harnesses

The SAI pipeline MUST support three harnesses: **Claude Code**, **opencode**, and **GitHub Copilot**. AGENTS.md SHALL list all three as supported harnesses, document an install path for each, and reflect each harness in the Fetch URL conventions table. Wrappers for each harness SHALL live under `commands/<harness>/` — `commands/claude/`, `commands/opencode/`, and `commands/copilot/` — with the Copilot wrapper file using the `.prompt.md` extension per the Copilot harness convention.

#### Scenario: Supported harnesses list
- **WHEN** a reader consults AGENTS.md's "Supported harnesses" line
- **THEN** the line names Claude Code, opencode, AND GitHub Copilot

#### Scenario: Copilot install path documented
- **WHEN** a reader consults the installation section
- **THEN** the section lists `~/.claude/commands/` (Claude Code), `~/.config/opencode/commands/` (opencode), AND the VS Code user prompts folder for GitHub Copilot (referencing `INSTALL.copilot.md`)

#### Scenario: Copilot wrapper file extension
- **WHEN** a Copilot wrapper is added for a new sai-* command
- **THEN** the file is named `commands/copilot/sai-{name}.prompt.md` (not `sai-{name}.md`)

### Requirement: Every change MUST consider all three harnesses

Every change to a wrapper (`commands/{claude,opencode,copilot}/`), a shared instruction (`sai/instructions/`), a skill, an installer, or AGENTS.md MUST consider all three harnesses. Harness-agnostic content MUST stay harness-agnostic (no harness named at all). The moment one harness is named, the change MUST address all three harnesses (or mark the others explicitly N/A). Before finishing any change, the diff SHALL be scanned for a harness name; if one appears, the other two SHALL be verified as addressed or explicitly marked N/A.

#### Scenario: Diff names one harness
- **WHEN** a change's diff mentions a Claude Code-specific mechanism (e.g. `AskUserQuestion`)
- **THEN** the same change also addresses opencode's equivalent (e.g. `question` tool) and Copilot's plain-text fallback, or marks them N/A with justification

#### Scenario: Harness-agnostic content stays harness-agnostic
- **WHEN** a change is purely a markdown formatting fix in a `sai/instructions/` file
- **THEN** the diff does not introduce a harness name and no harness-specific follow-up is required

### Requirement: Mirror discipline extends to commands/copilot/

Any change to `commands/claude/` MUST be mirrored to `commands/opencode/` and `commands/copilot/` in the same commit, and vice versa — all three harness directories stay in sync. The PR checklist SHALL enforce this. Mirror discipline is one consequence of the universality rule and covers wrapper files only; it does not cover shared instructions, installers, or docs, which are governed by the broader universality rule above.

#### Scenario: Claude wrapper edited
- **WHEN** a change edits `commands/claude/sai-{name}.md`
- **THEN** the same change edits `commands/opencode/sai-{name}.md` and `commands/copilot/sai-{name}.prompt.md` in the same commit, with equivalent content adjusted for each harness's frontmatter conventions

#### Scenario: Copilot wrapper edited
- **WHEN** a change edits `commands/copilot/sai-{name}.prompt.md`
- **THEN** the same change edits `commands/claude/sai-{name}.md` and `commands/opencode/sai-{name}.md` in the same commit

### Requirement: Fetch URL conventions cover all three harnesses

AGENTS.md's "Format conventions" section SHALL document the Fetch URL convention for every supported harness: `@~/.claude/sai/instructions/...` for Claude Code, `@~/.config/opencode/sai/instructions/...` for opencode, and the Copilot SAI folder (resolved via the Copilot fetch skill) for GitHub Copilot. Skill fetches SHALL continue to use project-local paths (`.claude/skills/...` or `.opencode/skills/...`).

#### Scenario: Claude-side fetch reference
- **WHEN** an instruction needs to fetch a shared artifact for a Claude Code wrapper
- **THEN** the Fetch reference uses `@~/.claude/sai/instructions/...`

#### Scenario: Copilot-side fetch reference
- **WHEN** an instruction needs to fetch a shared artifact for a GitHub Copilot wrapper
- **THEN** the Fetch reference uses the Copilot SAI folder resolved by the Copilot fetch skill (per `INSTALL.copilot.md`)

#### Scenario: Skill fetches use project-local paths
- **WHEN** any wrapper fetches a skill
- **THEN** the path is `.claude/skills/...` or `.opencode/skills/...` (project-local), not a user-global path
