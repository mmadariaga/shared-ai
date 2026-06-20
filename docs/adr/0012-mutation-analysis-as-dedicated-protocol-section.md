# ADR 0012: Mutation Analysis (pass 11) as a dedicated protocol section in review.md

## Status

Accepted

## Context

`sai-5-review` (`sai/instructions/review.md`) runs ten read-only analysis passes over the diff against the parent branch. The passes live as one-line bullets inside **Step 2**, which dispatches read-only `budget-explorer` subagents and is contractually read-only.

The `add-llm-mutation-analysis-to-review` change adds **pass 11 (Mutation Analysis)**. Unlike passes 1–10, pass 11 *writes* to the working tree (applies and reverts mutations), runs the project's test command, and dispatches a *write-capable* subagent. It carries a multi-step safety protocol (baseline pass, per-mutation pre-check, file-scoped revert, revert verification, 60 s timeout, ≤5–6 mutations/subagent).

Folding that protocol into Step 2's numbered list would break Step 2's read-only / `budget-explorer` contract and bury a long protocol inside a list of one-liners.

## Decision

Represent pass 11 in two places:

1. A one-line discoverability entry — `11. **Mutation Analysis** — …` — appended to the Step 2 passes list, so the pass count and ordering are visible alongside passes 1–10.
2. The full protocol in a dedicated section `## Mutation Analysis (Pass 11)`, placed **after Step 2 and before Step 3**. Step 4's report consumes its outputs.

The numbered Step 2 entry explicitly defers execution to the dedicated section rather than being run inside Step 2's read-only framing.

## Alternatives Considered

- **Inline the whole protocol as item 11 in the Step 2 numbered list** — rejected: it is far longer than a bullet and violates Step 2's read-only / `budget-explorer` contract.
- **A full new top-level "Step 2.5"** — rejected as heavier than needed; a named subsection after Step 2 reads better and keeps the existing Step numbering stable.

## Consequences

- The document's structural skeleton now anchors pass numbering to a one-liner in Step 2 plus a standalone protocol section; future passes append to the same pattern.
- A reader expecting pass 11 to look like passes 1–10 will instead find a one-liner that points to a dedicated section — the cross-reference must be kept intact when either location is edited.
- The read-only contract of Step 2 is preserved: the only write-capable, test-running work is quarantined in the dedicated section.
