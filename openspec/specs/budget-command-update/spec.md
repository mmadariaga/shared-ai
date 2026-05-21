## MODIFIED Requirements

### Requirement: Claude Code budget.md loads budget aggregator skill

`commands/claude/budget.md` SHALL load the universal `budget` aggregator skill, which in turn loads `budget-explorer`, `budget-executor`, and `token-efficient-languages`.

**Before:**
```
Fetch @skills/claude/budget-explorer/SKILL.md
Fetch @skills/claude/budget-executor/SKILL.md
```

**After:**
```
Fetch @skills/budget/SKILL.md
```

The `budget` skill is a universal aggregator installed at `~/.claude/skills/budget/SKILL.md` that fetches the three underlying budget skills.

#### Scenario: /budget in Claude Code loads all three skills

- **WHEN** a user runs `/budget` in Claude Code
- **THEN** budget-explorer, budget-executor, AND token-efficient-languages are all loaded into the session via the aggregator

### Requirement: OpenCode budget.md loads budget aggregator skill

`commands/opencode/budget.md` SHALL load the universal `budget` aggregator skill, which in turn loads `budget-explorer`, `budget-executor`, and `token-efficient-languages`.

**Before:**
```
Fetch @skills/opencode/budget-explorer/SKILL.md
Fetch @skills/opencode/budget-executor/SKILL.md
```

**After:**
```
Fetch @skills/budget/SKILL.md
```

The `budget` skill is a universal aggregator installed at `~/.config/opencode/skills/budget/SKILL.md` that fetches the three underlying budget skills.

#### Scenario: /budget in OpenCode loads all three skills

- **WHEN** a user runs `/budget` in OpenCode
- **THEN** budget-explorer, budget-executor, AND token-efficient-languages are all loaded into the session via the aggregator

### Requirement: budget.md description field unchanged

The `description:` frontmatter field in both budget.md files SHALL NOT be changed. Only the Fetch directives in the body are modified.

#### Scenario: Description stability

- **WHEN** budget.md is read after the change
- **THEN** the `description:` value is identical to its pre-change content
