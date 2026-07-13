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

### Requirement: Copilot-specific skill and agent directories exist in the repo

The repository MUST contain a `skills/copilot/` directory holding Copilot-specific subagent skills (`skills/copilot/budget-explorer/SKILL.md`, `skills/copilot/budget-executor/SKILL.md`, `skills/copilot/budget-subagent/SKILL.md`, `skills/copilot/fetch/SKILL.md`) and an `agents/copilot/` directory holding Copilot custom agent definitions (`agents/copilot/budget-explorer.agent.md`, `agents/copilot/budget-executor.agent.md`, `agents/copilot/budget-subagent.agent.md`). The custom agent files are installed to `~/.copilot/agents/` on the user's machine.

#### Scenario: Copilot skill subdirectories present
- **WHEN** a reader consults the repo structure for Copilot-specific skills
- **THEN** `skills/copilot/` contains `budget-explorer/`, `budget-executor/`, `budget-subagent/`, and `fetch/`

#### Scenario: Copilot custom agent definitions present
- **WHEN** a reader consults the repo structure for Copilot custom agents
- **THEN** `agents/copilot/` contains `budget-explorer.agent.md`, `budget-executor.agent.md`, and `budget-subagent.agent.md`

### Requirement: Project-local skill and command paths cover all three harnesses

The "Skill fetches" list in AGENTS.md MUST include `.github/skills/...` (project-local skill path for Copilot) alongside `.claude/skills/...` and `.opencode/skills/...`. The "Project-local commands" list in AGENTS.md MUST include `.github/prompts/` (project-local command path for Copilot) alongside `.claude/commands/` and `.opencode/commands/`.

#### Scenario: Copilot skill fetch path documented
- **WHEN** a Copilot wrapper fetches a skill
- **THEN** the path is `.github/skills/...` (project-local), not a user-global path

#### Scenario: Copilot project-local commands documented
- **WHEN** a reader consults the "Project-local commands" list in AGENTS.md
- **THEN** `.github/prompts/` is listed for GitHub Copilot alongside `.claude/commands/` and `.opencode/commands/`

### Requirement: Prerequisite-check paragraph names the fetch path for all three harnesses

The "Prerequisite check" paragraph in AGENTS.md MUST document the fetch path for `@sai/instructions/prereqs.md` for every supported harness: `~/.claude/sai/` for Claude Code, `~/.config/opencode/sai/` for opencode, and the Copilot SAI folder (resolved by the Copilot fetch skill) for GitHub Copilot.

#### Scenario: Prereqs fetch resolution covers Copilot
- **WHEN** a reader consults the "Prerequisite check" paragraph
- **THEN** the paragraph names the Copilot SAI folder as one of the resolution targets for `@sai/instructions/prereqs.md`

### Requirement: Cost Discipline paragraph names the cheap-tier subagent for all three harnesses

The "Cost Discipline" paragraph in AGENTS.md MUST describe the cheap-tier subagent for every supported harness: Claude Code (`subagent_type: Explore`, model haiku/sonnet), opencode (`explore` keyword, model resolved via `opencode.jsonc`), AND Copilot (`budget-explorer` custom agent, GPT-5 mini). The default tier is the cheap tier; the escalated tier applies only for multi-step synthesis.

#### Scenario: Cost discipline paragraph names all three subagent bindings
- **WHEN** a reader consults the "Cost Discipline (research subagents)" paragraph
- **THEN** the paragraph names three subagent bindings (Claude Code, opencode, Copilot) and their respective model-resolution mechanisms

### Requirement: Harness-specific adapter carve-out
The mirror discipline (the requirement that any change to `commands/claude/`, `commands/opencode/`, or `commands/copilot/` be mirrored to the other two harness directories in the same commit) recognizes one explicit exception category: a **harness-specific adapter**. A change qualifies as a harness-specific adapter when ALL of the following hold:
1. The change fills a gap in exactly one harness's wrapper or instruction set.
2. The underlying behavior difference is unique to that harness (e.g. opencode's `$ARGUMENTS` substitution is a wrapper-template-only behavior that Claude Code and Copilot do not have).
3. The fix has no meaning in the other harnesses, or would be actively wrong noise if mirrored (e.g. emitting a wrapper-echo line in Claude Code or Copilot, where `$ARGUMENTS` is substituted into the body file directly and the line is consumed by nothing).

A harness-specific adapter MAY be confined to a single harness directory and exempted from the mirror discipline. The change proposal SHALL justify the adapter category by naming the unique harness behavior, the gap being filled, and why the fix is wrong or meaningless in the other harnesses; the proposal's "What Changes" or "Additional Notes" section is the conventional location. Adapters are recorded per change and are not blanket exemptions — a future change that does not fit the three conditions above SHALL follow full mirror discipline.

#### Scenario: Adapter change is confined to one harness
- **WHEN** a change qualifies as a harness-specific adapter per the three conditions above
- **THEN** the change edits exactly one of `commands/claude/`, `commands/opencode/`, or `commands/copilot/` and SHALL NOT edit the other two harness directories in the same commit
- **AND** the change proposal names the unique harness behavior, the gap being filled, and why the fix is meaningless in the other harnesses

#### Scenario: Non-adapter change still requires full mirror
- **WHEN** a change does NOT fit all three adapter conditions (e.g. it changes cross-cutting behavior, the gap exists in two or more harnesses, or the fix is meaningful in all harnesses)
- **THEN** the change SHALL follow full mirror discipline and edit all three harness directories in the same commit

#### Scenario: Proposal justification is required
- **WHEN** a change is filed as a harness-specific adapter
- **THEN** the proposal contains an explicit justification naming (a) the unique harness behavior being adapted, (b) the gap being filled, and (c) why the fix is meaningless in the other harnesses — without that justification, the change is not a valid adapter and the mirror discipline applies
