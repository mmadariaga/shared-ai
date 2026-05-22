## MODIFIED Requirements

### Requirement: All claude command wrappers load the fetch skill before any @sai/ fetch
Every file under `commands/claude/*.md` SHALL include `Fetch @skills/fetch/SKILL.md` as the first line of the command body (after frontmatter), before any `Fetch @sai/...` directive.

This mirrors the existing `Load skill fetch before you continue.` line present in every `commands/opencode/*.md` wrapper. Without it, Claude attempts to resolve `@sai/` paths before the resolution rules are active and fails.

The directive MUST appear before any other `Fetch @` call in the file so the skill is loaded and its rules are active when the subsequent sai-* body is fetched.

#### Scenario: fetch skill loads before sai body
- **WHEN** a user invokes any `/sai-*` command in Claude Code
- **THEN** Claude loads the fetch skill first, then resolves `Fetch @sai/commands/<cmd>.md` using the rules from that skill

#### Scenario: missing fetch directive causes broken path resolution
- **WHEN** a command wrapper only has `Fetch @sai/commands/<cmd>.md` without loading the fetch skill first
- **THEN** Claude has no resolution rule for `@sai/` and may search the wrong directories or fail silently

#### Scenario: all 14 claude command files are updated
- **WHEN** the change is applied
- **THEN** every file matching `commands/claude/*.md` contains `Fetch @skills/fetch/SKILL.md` as its first content line
