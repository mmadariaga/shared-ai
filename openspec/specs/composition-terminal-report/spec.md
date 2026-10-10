# composition-terminal-report Specification

## Purpose

Defines the combined terminal report format for the `/sai-review` composition, including per-audit outcome lines and the cross-segment changed-files union.

## Requirements

### Requirement: Combined terminal report on the final segment

When the final activated audit segment completes, or the review segment completes with zero audits activated, the composition SHALL print a combined terminal report containing (1) one per-audit outcome line per activated audit showing its status (completed / failed / cancelled) and the path to its artifact, and (2) the cross-segment changed-files union — the ordered, duplicate-free union across all segments in first-seen order. A non-final audit segment SHALL NOT print its standalone audit completion literal; its terminal navigation resolves to the composition-owned authorized transition only.

#### Scenario: Combined report lists every activated audit
- **WHEN** a run activates security and accessibility and both complete
- **THEN** the terminal report SHALL contain one outcome line per activated audit with its artifact path, followed by the cross-segment changed-files union, and SHALL NOT contain any standalone audit completion literal

### Requirement: Zero-audit terminal literal

After successful review and a legible triage parse, when zero audits were activated, the composition SHALL apply the Direct Build close using only the freshly generated `review.md`. When no report qualifies for the Direct Build round, its standard close SHALL print exactly the literal `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` and stop, preserving any warning the run produced. Open fixable findings and open Questions SHALL receive the Direct Build round, with no fix dispatch before the user chooses to fix. The composition SHALL NOT invent a distinct meta-review-only success message that replaces the pinned completion texts. All shared-close paths SHALL retain this run-specific standard close; decline paths SHALL retain the existing manual-build guidance.

#### Scenario: Zero-audit literal is exact
- **WHEN** the review segment completes successfully, the triage parse is legible, no audit segment activates, and `review.md` has no open fixable finding and no open Question
- **THEN** the terminal output SHALL preserve exactly `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` with the resolved change name substituted, followed by the accumulated changed-files union, retaining any existing warnings

#### Scenario: Zero-audit eligible findings receive the existing close
- **WHEN** the review segment completes successfully, the triage parse is legible, no audit segment activates, and the freshly generated `review.md` contains an open fixable finding or an open Question
- **THEN** the composition SHALL apply the Direct Build close with its round, exclusions, fix-loop and one-local-commit boundaries without activating an audit
