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

When zero audits were activated, the composition SHALL print exactly the literal `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` and stop. The composition SHALL NOT invent a distinct meta-review-only success message that replaces the pinned completion texts.

#### Scenario: Zero-audit literal is exact
- **WHEN** the review segment completes and no audit segment activates
- **THEN** the terminal output SHALL be exactly `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` with the resolved change name substituted, followed by the accumulated changed-files union
