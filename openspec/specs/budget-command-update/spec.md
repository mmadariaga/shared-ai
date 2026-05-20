## MODIFIED Requirements

### Requirement: Claude Code budget.md loads token-efficient-languages

`claude/commands/budget.md` SHALL load `token-efficient-languages` in addition to `budget-explorer` and `budget-executor`.

**Before:**
```
Fetch @skills/claude/budget-explorer/SKILL.md
Fetch @skills/claude/budget-executor/SKILL.md
```

**After:**
```
Fetch @skills/claude/budget-explorer/SKILL.md
Fetch @skills/claude/budget-executor/SKILL.md
Fetch @~/.claude/skills/token-efficient-languages/SKILL.md
```

The `token-efficient-languages` Fetch SHALL appear after the two existing Fetch lines.

#### Scenario: /budget in Claude Code loads all three skills

- **WHEN** a user runs `/budget` in Claude Code
- **THEN** budget-explorer, budget-executor, AND token-efficient-languages are all loaded into the session

### Requirement: OpenCode budget.md loads token-efficient-languages

`opencode/commands/budget.md` SHALL load `token-efficient-languages` in addition to `budget-explorer` and `budget-executor`.

**Before:**
```
Fetch @skills/opencode/budget-explorer/SKILL.md
Fetch @skills/opencode/budget-executor/SKILL.md
```

**After:**
```
Fetch @skills/opencode/budget-explorer/SKILL.md
Fetch @skills/opencode/budget-executor/SKILL.md
Fetch @~/.config/opencode/skills/token-efficient-languages/SKILL.md
```

The `token-efficient-languages` Fetch SHALL appear after the two existing Fetch lines.

#### Scenario: /budget in OpenCode loads all three skills

- **WHEN** a user runs `/budget` in OpenCode
- **THEN** budget-explorer, budget-executor, AND token-efficient-languages are all loaded into the session

### Requirement: budget.md description field unchanged

The `description:` frontmatter field in both budget.md files SHALL NOT be changed. Only the Fetch directives in the body are modified.

#### Scenario: Description stability

- **WHEN** budget.md is read after the change
- **THEN** the `description:` value is identical to its pre-change content
