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

After successful review and a valid triage parse, when zero audits were activated, the composition SHALL apply its existing shared findings-driven Direct Build close using only the freshly generated `review.md`. When no eligible findings remain, its standard close SHALL print exactly the literal `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` and stop, preserving existing warnings and blocked-finding explanations. Eligible findings SHALL receive the existing correction choice, with no fix dispatch before explicit Direct Build selection. The composition SHALL NOT invent a distinct meta-review-only success message that replaces the pinned completion texts. All shared-close paths SHALL retain this run-specific standard close; decline paths SHALL retain the existing manual-build guidance.

#### Scenario: Zero-audit literal is exact
- **WHEN** the review segment completes successfully, the triage parse is valid, no audit segment activates, and no eligible findings remain
- **THEN** the terminal output SHALL preserve exactly `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` with the resolved change name substituted, followed by the accumulated changed-files union, retaining any existing warnings or blocked-finding explanations

#### Scenario: Zero-audit eligible findings receive the existing close
- **WHEN** the review segment completes successfully, the triage parse is valid, no audit segment activates, and the freshly generated `review.md` contains an eligible finding
- **THEN** the composition SHALL apply the shared Direct Build close and its existing explicit selection, exclusions, fix-loop and one-local-commit boundaries without activating an audit
