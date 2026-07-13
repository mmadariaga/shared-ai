## Why

Sometimes a feature is hard not because of the change itself but because of the code it lands in — a huge file, tangled responsibilities, or no clean extension point at the exact site where the feature must plug in. `sai-explore` today judges only whether an idea is *too big* (§4 size), never whether the *integration point is hostile*, so it never recommends the "make the change easy, then make the easy change" preparatory refactor that would shrink and de-risk the feature diff.

## What Changes

- Add a **refactor-first assessment** step to `sai/instructions/explore.md`: after the §4 size judgment, `sai-explore` judges friction at the exact integration point (mixed responsibilities / no clean extension seam) — a qualitative judgment distinct from §4's size signals.
- When friction fires, `sai-explore` prepends a **behavior-preserving SOLID refactor as slice 0** of the crystallized set, reusing the §6 sliced-crystallization protocol. Slice 0 composes with §4's size-based slicing (refactor → skeleton → backlog) and can promote a §5 single-block idea into a 2-block set (refactor → feature).
- Define slice 0's **"done"** in SOLID terms: SRP extraction to create the seam + OCP so the feature attaches by extension + existing tests green + opened only along the axis the imminent feature needs (YAGNI guardrail is mandatory).
- Add a **§6 outcome-description exception**: slice 0 is described as enabling / behavior-preserving and explicitly marked as such, not as user-facing value (every other slice keeps its user-facing outcome description).
- Keep it a **recommendation, not a gate**: if the user prefers to land the feature in the tangle, `sai-explore` states the risk once and proceeds — inheriting §4's tone.

## Capabilities

### New Capabilities
- `explore-refactor-first-slicing`: the integration-point friction assessment, slice-0 emission, SOLID-scoped slice-0 definition with YAGNI guardrail, the §6 outcome-description exception for slice 0, and the recommendation-not-gate behavior.

### Modified Capabilities
- `explore-vertical-slicing`: the §6 sliced-crystallization protocol now composes with an optional slice 0 prepended ahead of the Walking Skeleton (slice 1); friction becomes a second slicing axis that composes with the existing size axis.

## Impact

- **Sole edit target**: `sai/instructions/explore.md` (a new step plus cross-reference touch-ups in §4/§5/§6). No other `sai-*` command, wrapper, skill, schema, or config is modified.
- **Reasoning cost**: explore mode does slightly more work before crystallization (one qualitative friction judgment, and occasionally one extra emitted block).
- **Downstream**: no change to `/sai-1-spec` or later phases — slice 0, when present, flows through the pipeline as an ordinary change whose proposal happens to describe an enabling refactor.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/explore.md` — current §4 (slicing assessment), §5 (single-change crystallization), §6 (sliced crystallization) that this change extends.
- `openspec/specs/explore-vertical-slicing/spec.md` — normative behavior for §4/§6 being modified.
- `openspec/specs/explore-crystallization-block/spec.md` — the `Ready to Propose` block field contract (unchanged by this change).

**External URLs**: None

## Additional Notes

- Two orthogonal slicing axes compose: **size** (§4, existing) and **integration friction** (new). The final block set is the product of both — friction can prepend slice 0 to a single-block idea (→ 2 blocks) or to an already-sliced set (→ refactor + skeleton + backlog).
- Friction is judged **at the integration point**, not as a global tech-debt audit — this keeps the trigger local, concrete, and tied to the feature at hand. OCP is used as a diagnostic lens ("extend vs. modify?"), not only as a design goal.
- Blast-radius metrics from codegraph are **not** a hard trigger — they may be cited as evidence, but the trigger stays qualitative like §4's "too big".
- Because friction detection is qualitative, it can misfire; this is mitigated by keeping it guidance (state the risk once, proceed if the user declines), never a gate.
