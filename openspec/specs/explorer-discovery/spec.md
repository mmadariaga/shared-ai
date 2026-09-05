# explorer-discovery Specification

## Purpose
TBD - created by archiving change improve-explorer-description. Update Purpose after archive.
## Requirements
### Requirement: Outcome-focused explorer descriptions for SAI-built projects

Both `agents/opencode/explore.md` and `agents/claude/budget-explorer.md` SHALL carry a frontmatter `description` that sells fast, cost-effective read-only exploration for SAI-built projects as knowing their architecture and where to start versus generic search, with bounded summaries and no writes, without enumerating codegraph or index internals.

#### Scenario: Listings sell outcome not mechanism

- **WHEN** the explore and budget-explorer agent descriptions are read in a listing or picker
- **THEN** each describes fast cost-effective SAI-aware exploration with architecture and starting-point guidance and bounded read-only limits

### Requirement: Mirrored description-only change across harnesses

The change SHALL update only the `description` field in both agent files with the same meaning, preserving each harness keyword name and every `model`, `mode`, `effort`, `tools`, and body Fetch line, keeping the text concise and in English.

#### Scenario: Both harnesses stay in sync without side edits

- **WHEN** the staged diff of both agent files is inspected
- **THEN** only the two description lines differ and all other frontmatter and body lines are unchanged

### Requirement: Read-only bounded framing without caller-guidance change

Each description SHALL stay read-only with bounded summaries and no writes, framing index help as judging current versus superseded, and SHALL NOT change caller guidance, policies, skills, or README delegation behavior.

#### Scenario: Description claims no more than implemented bounds

- **WHEN** either updated description is read after the change
- **THEN** it promises only bounded read-only exploration with no writes and no automatic-delegation change

