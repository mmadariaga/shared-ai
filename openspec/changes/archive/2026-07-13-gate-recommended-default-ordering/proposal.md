## Why

The SAI pipeline's blocking gates present their options without a declared default, so the user re-decides the same "proceed" branch at every gate even after the careful work was already front-loaded in spec-time. Declaring a recommended default and emitting it first cuts clicks, iterations, and long-run cost under the "expensive friction up top, cheap rolling downstream" principle.

## What Changes

- Each of 7 blocking gates declares one **default** option, emits it as the **first** option in the harness option-picker, and labels it `Recommended` (e.g. `yes (Recommended)`).
- Defaults per gate: commit-auth → `yes`; specs-approval → `yes`; backfill conflict → `proceed`; artifact-feedback → `Give feedback` (iteration-aware label preserved); implementation-continuation → `Stop for a new chat`; explore-review language → `English`; archive unchecked-items → `yes`.
- "Default" means **reorder + `Recommended` label only** — NOT auto-selection. `AskUserQuestion` never auto-selects, so the wait, decline rules, and "explicit yes required" semantics stay byte-for-byte intact.
- No default is written to disk; the `closed-choice-prompts` rule in `remember.md` is unchanged (only per-instruction option order changes).
- **Non-goal**: this change does NOT add an "Allow on this session" option (that is a separate change).

## Capabilities

### New Capabilities
- `implementation-continuation`: the sai-2-design (a)/(b) proceed-to-implementation gate declares `Stop for a new chat` as its recommended default, emitted first.

### Modified Capabilities
- `commit-auth-gate`: the git-commit authorization gate emits `yes` first, labeled Recommended.
- `specs-approval-gate`: the sai-2-design specs-approval gate emits `yes` first, labeled Recommended.
- `backfill-conflict-detection`: the conflict proceed/abort gate emits `proceed` first, labeled Recommended.
- `artifact-feedback-gate`: **MODIFIED** — the recommended-first + label is folded into the existing `Gate presentation via the harness option-picker` requirement (not a separate ADDED requirement), so a single requirement governs option 1; coexists with the iteration-aware `Give feedback` / `Give more feedback` label.
- `explore-review-language-gate`: **MODIFIED** — the recommended-first + label is folded into the existing `Gate question presentation` requirement, which also gains a reconciling clause so `English (Recommended)` does not appear to contradict the "keep the literal word `English`" guarantee.
- `sai-archive-soft-warn-audits`: the archive incomplete-tasks soft gate emits `yes` first, labeled Recommended.

## Impact

- Instruction files only (no production/runtime code): `sai/instructions/commit.md`, `sai/instructions/design.md`, `sai/instructions/backfill.md`, `sai/instructions/artifact-feedback-gate.md`, `sai/instructions/explore.md`, `sai/instructions/archive.md`, `sai/commands/sai-2-design.md`.
- No changes to `sai/instructions/remember.md` (`closed-choice-prompts` rule), `.openspec.yaml` writes, or any schema.

## Proposal Research Documentation

**Local files**: `sai/instructions/commit.md:107`, `sai/instructions/design.md:5`, `sai/instructions/backfill.md:75`, `sai/instructions/artifact-feedback-gate.md:31-37`, `sai/instructions/explore.md:39-44`, `sai/instructions/archive.md:36`, `sai/commands/sai-2-design.md:41-46`, `sai/instructions/remember.md:10-14`, `openspec/specs/{commit-auth-gate,specs-approval-gate,backfill-conflict-detection,artifact-feedback-gate,explore-review-language-gate,sai-archive-soft-warn-audits}/spec.md`

**External URLs**: None

## Additional Notes

- In current instruction text the recommended option already happens to be listed first at every gate; this change makes that ordering **normative** (so it cannot regress) and adds the `Recommended` label — the label is the only visible behavioral change today.
- The `Recommended` label follows the `AskUserQuestion` convention: first option, ` (Recommended)` appended to the label. On harnesses with no native option-picker (plain-text fallback), the recommended option stays first in the printed list and carries the `Recommended` marker.
- The feedback gate's `Recommended` marker is scoped to the **first presentation only** (iteration counter == 0, when option 1 reads `Give feedback`). On any re-presentation after a feedback turn (counter > 0, `Give more feedback`), no option carries the marker — the re-offer is neutral. Ordering is unaffected: the feedback option stays first in every presentation; only the marker drops.
- **Design-phase flag — inline-prose gates vs picker.** Two of the gates are written as inline prose, not as an explicit picker call: the specs-approval gate (`design.md:5`, "…(yes/no, and any notes)") and the implementation-continuation (a)/(b) gate (`sai-2-design.md:41-46`). The `closed-choice-prompts` rule in `remember.md` routes both through the harness option-picker at runtime, so "emit the recommended option first + `Recommended` marker" holds — but the implementer SHALL verify the rendered presentation rather than assume it, since the instruction text does not visibly invoke a picker. (The feedback gate, by contrast, already fetches a shared picker instruction.)
- **Sibling capability left untouched by design.** Specs approval is described by two capabilities: `specs-approval-gate` (the prompt content/semantics, rendered in `design.md`) and `sai-2-design-approval-gate` (gate *placement* — that it fires after the prereqs/existence check and before generation). This change touches only `specs-approval-gate` because the option ordering lives with the prompt content; `sai-2-design-approval-gate` pins placement, not option order, so there is no divergent-order risk and it is intentionally not modified.
