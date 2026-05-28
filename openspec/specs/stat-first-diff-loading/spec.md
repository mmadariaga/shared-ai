## ADDED Requirements

### Requirement: Audit instructions MUST check diff size before loading the full unified diff.

Applies to review.md, security.md, and performance.md. Prevents unconditional loading of large diffs at frontier-tier token cost.

#### Scenario: Diff is within token budget
- **WHEN** `git diff --stat` reports total LOC ≤ 500
- **THEN** the agent SHALL load the full unified diff with `git diff {parent-branch}...HEAD` and review directly

#### Scenario: Diff exceeds token budget
- **WHEN** `git diff --stat` reports total LOC > 500
- **THEN** the agent SHALL NOT load the full unified diff
- **THEN** the agent SHALL delegate per-file inspection to `budget-explorer` subagents (one per file or logical group) with output contract: file:line + finding category + ≤80 words per finding
