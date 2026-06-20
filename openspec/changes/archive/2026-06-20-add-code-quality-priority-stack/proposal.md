## Why

Code quality is currently enforced implicitly through scattered Hard Rules in `implement.md` and review-time checks in `review.md`, with no shared tie-breaker. When two good practices conflict (YAGNI vs. honoring an existing abstraction, adding a dependency vs. writing it inline, "boring" vs. "clever"), the implementation agent has no deterministic way to resolve the tension, and the reviewer has no single rule to cite.

## What Changes

- Add a `## Code Quality Priority Stack` section to `sai/instructions/implement.md`, placed immediately after `## Hard Rules`. It defines 6 priority-ordered rules plus a project-alignment meta-rule that outranks all of them.
- The ordering encodes the tie-breaker: **(1)** YAGNI > **(2)** SOLID (operational, OOP-only) > **(3)** self-documenting + clean code > **(4)** dependency ladder (already-installed dep > stdlib > native platform) > **(5)** no boilerplate / DRY / deletion over addition / boring-over-clever > **(6)** minimum surface area. The meta-rule — *align with the surrounding codebase, breaking the fewest numbered rules as possible* — overrides the stack whenever they conflict.
- SOLID is expressed operationally (e.g. "one reason to change", "extend without breaking existing callers"), never as the generic slogan "follow SOLID" — consistent with `design.md:126`, which rejects generic best-practices as Conventions.
- Extend the Maintainability rule in `sai/instructions/review.md:90` to a single added sentence that references the new priority stack as the resolution order, instead of restating the 6 rules.

## Capabilities

### New Capabilities
- `code-quality-priority-stack`: a priority-ordered set of code-quality rules with a project-alignment meta-rule, authored into the implementation instructions so the plan-generation agent (and, transitively, the apply and review agents) resolves quality tensions deterministically.

### Modified Capabilities
<!-- None. The review.md edit is a cross-reference to the new capability, not a change to an existing capability's spec-level behavior. -->

## Impact

- **Files touched (by the eventual implementation):**
  - `sai/instructions/implement.md` — new `## Code Quality Priority Stack` section (~25 lines) after `## Hard Rules`.
  - `sai/instructions/review.md` — extend the Maintainability rule (line 90) by one sentence referencing the stack.
- **Behavioral reach:** `apply.md` follows the plan produced from `implement.md`, so it inherits the stack without its own copy. RED test code is governed by the same rules for the same reason — the rules live in the generated plan, not in `apply.md`.
- **No production/application code, dependencies, or APIs are affected** — this change only edits SAI workflow instruction files.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/implement.md` — `## Hard Rules` section (line 273+); confirmed insertion point and that existing rules align with stack priorities #5/#6.
- `sai/instructions/review.md:90` — Maintainability review category; confirmed it lists SOLID/coupling/duplication/naming and is the line to extend.
- `sai/instructions/design.md:124-127` — `## Implementation Context` → Conventions rule rejecting generic "follow SOLID"/"write clean code"; basis for the operational-SOLID constraint.

**External URLs**: None

## Additional Notes

- The existing Hard Rules in `implement.md` stay as-is; they are consistent with priority #5 (boring, single path) and #6 (minimum, no speculative code). The new section ranks them rather than replacing them — logical precedence is why it sits directly after `## Hard Rules`.
- `apply.md` is intentionally out of scope: it executes the plan and needs no copy of the stack.
- Per-stack customization of the priority order is a non-goal (possible follow-up).
