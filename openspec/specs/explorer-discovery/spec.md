# explorer-discovery Specification

## Purpose
Make the explorer agent descriptions select SAI-aware read-only research in agent listings and pickers.
## Requirements
### Requirement: Outcome-focused explorer descriptions for SAI-built projects

Both `agents/opencode/explore.md` and `agents/claude/budget-explorer.md` SHALL carry a frontmatter `description` that leads with the agent's role and sells fast, cost-effective read-only exploration for SAI-built projects as knowing their architecture and where to start versus generic search, with bounded summaries and no writes, without enumerating codegraph or index internals.

#### Scenario: Listings sell outcome not mechanism

- **WHEN** the explore and budget-explorer agent descriptions are read in a listing or picker
- **THEN** each describes fast cost-effective SAI-aware exploration with architecture and starting-point guidance and bounded read-only limits

### Requirement: Mirrored descriptions across harnesses

Both agent files SHALL carry the same description text, concise and in English, and each SHALL keep its harness agent name (`explore` on opencode, `budget-explorer` on Claude Code).

#### Scenario: Both harnesses stay in sync

- **WHEN** the two explorer agent descriptions are compared
- **THEN** they are identical

### Requirement: Read-only bounded framing without caller-guidance change

Each description SHALL stay read-only with bounded summaries and no writes, framing index help as judging current versus superseded, and SHALL NOT change caller guidance, policies, skills, or README delegation behavior.

#### Scenario: Description claims no more than implemented bounds

- **WHEN** either updated description is read after the change
- **THEN** it promises only bounded read-only exploration with no writes and no automatic-delegation change

