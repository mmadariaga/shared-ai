# composition-terminal-report Specification

## Purpose

Defines the combined terminal report format for the `/sai-review` composition, including per-audit outcome lines and the cross-segment changed-files union.

## Requirements

### Requirement: Combined terminal report on the final segment

After the last segment that ran, `/sai-deep-review` SHALL print one close for the whole run. When the review segment completed, the close SHALL carry the finding counts of the re-read `review.md` and its `## Recommended Audits` block, and one line per audit that ran with its status (`completed` with the counts of its `Summary:` tally and its report path, or `failed` with its reason) and whether its report was committed or left uncommitted because the project ignores it, and SHALL end with exactly `Deep review done.`. The closing lines of the segments (`Review done.`, `{Audit} audit done.`, `Implement done.`) SHALL NOT be printed.

#### Scenario: Combined report lists every activated audit
- **WHEN** a run activates security and accessibility and both complete
- **THEN** the close SHALL contain one status line per activated audit with its report path and commit state, SHALL end with `Deep review done.`, and SHALL NOT contain any audit closing line

### Requirement: Zero-audit run closes with the deep-review close

After a completed review and a legible triage parse that activates no audit, `/sai-deep-review` SHALL say in its close that no audit ran. When `review.md` holds a fixable finding, the Assessment pass and the fix segment SHALL run over `review.md` alone; otherwise neither runs. The run SHALL end with exactly `Deep review done.` and SHALL keep every warning it produced.

#### Scenario: Zero audits and no fixable finding
- **WHEN** the triage activates no audit and `review.md` holds no fixable finding
- **THEN** no Assessment pass and no fix segment run, the close says that no audit ran, and the run ends with `Deep review done.`

#### Scenario: Zero audits with fixable findings
- **WHEN** the triage activates no audit and `review.md` holds an open fixable finding
- **THEN** the Assessment pass judges the findings of `review.md` and the fix segment fixes the ones it leaves, with one commit per fix step
