**Complexity**: medium (4 affected paths, 1 modified capability, no breaking change)

## Why

`GLOSSARY.md` is written only by the spec phase (`sai/instructions/spec.propose.md:28`), which has no commit gate, and it is excluded from both of apply's commit gates — per-Step commits are field-8-only and no Step writes it, and the terminal set is fixed to `docs/**` + `SAI_LEARNINGS.md` (`sai/instructions/apply.md:361`, normatively closed by `openspec/specs/sai-learnings-promotion/spec.md:82`). A resolved glossary term therefore never reaches git through the pipeline and lands permanently in the `Will NOT be committed` block of the terminal file visibility listing.

## What Changes

- The terminal documentation commit's fixed set gains the project-root `GLOSSARY.md` as a third eligible path: every changed path under `docs/**`, root `SAI_LEARNINGS.md` when the current promotion pass wrote it, and root `GLOSSARY.md` when it is changed in the working tree at terminal time.
- `GLOSSARY.md` eligibility follows the `docs/**` rule — evaluated at terminal time with no run-start baseline, whether the file is tracked-modified or untracked — not the `SAI_LEARNINGS.md` promotion-written rule, because apply never writes the glossary. An untracked bootstrapped glossary therefore qualifies exactly as an untracked new doc does.
- The non-mutating terminal file visibility listing and the staging sentences on both authorization paths (session-flag active and inactive) gain the glossary path; the commit stays one terminal commit under the existing single authorization gate, and its commit-type classification per `sai/policies/commit-rules.md` remains `docs`.
- Per-Step commits stay field-8-only and are not widened to sweep the glossary.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities
- `sai-learnings-promotion`: the terminal documentation commit's fixed path set, its non-mutating visibility listing, and its staging rule gain `GLOSSARY.md` as a third eligible path, under the same working-tree eligibility rule that already governs `docs/**`.

## Impact

- `sai/instructions/apply.md` — terminal set derivation (line 361) and the staging sentences on both authorization paths (lines 374 and 376) gain the glossary path; the eligibility sentence distinguishes the `docs/**`-style working-tree rule for `GLOSSARY.md` (tracked-modified or untracked) from the promotion-written rule for `SAI_LEARNINGS.md`.
- `sai/commands/sai-4-apply.md` — the fixed-set summary sentence (line 54) names the glossary trigger alongside the docs and learnings triggers.
- `openspec/specs/sai-learnings-promotion/spec.md` — MODIFIED requirements "Promotion is committed separately behind its own authorization gate", "Terminal documentation commit emits a file visibility listing", "Terminal documentation commit is independent of the per-Step add-list rule", and "Terminal documentation commit preserves the halted-run boundary" (the last one only for its stale docs/learnings enumeration, now updated to name the glossary).
- `test/apply-coordinator-verification.test.js` — the byte-exact terminal-set assertions updated for the three-member set.
- Not touched: the per-Step commit add-list rule (field-8-only), the promotion pass's classification and supersede rules, the empty-terminal-set rule (no message, no ask), the spec phase's `GLOSSARY.md` write behavior, the `GLOSSARY.md` format (`sai/policies/glossary-format.md`) and canonical location (`openspec/specs/glossary-location/spec.md`), the `GLOSSARY.md` file itself (no new domain term), wrappers, and the install manifest.

## Proposal Research Documentation

**Local files**: sai/instructions/apply.md (lines 341-376); sai/commands/sai-4-apply.md (line 54); openspec/specs/sai-learnings-promotion/spec.md (lines 78-166); openspec/specs/glossary-location/spec.md; sai/instructions/spec.propose.md (line 28); sai/instructions/implement.md (line 231); sai/instructions/review.md (line 93); test/apply-coordinator-verification.test.js (lines 225-303); GLOSSARY.md; sai/policies/glossary-format.md

**External URLs**: - None

## Additional Notes

- Reframing: the terminal set is not "files this run wrote" but "documentation-family paths outside every Step's add-list". Under that framing `GLOSSARY.md` was a missing member from the start, and its absence — not its inclusion — is the anomaly.
- Eligibility follows the `docs/**` rule (changed in the working tree at terminal time, no run-start baseline), not the `SAI_LEARNINGS.md` rule. Under the latter the condition would be structurally unsatisfiable, since apply never writes the glossary (`sai/instructions/apply.md:361`).
- Apply committing a file authored by an earlier phase is already the accepted, explicitly documented semantics of `docs/**` (`sai/instructions/apply.md:361`), so this introduces no new property.
- Trade-off accepted: a glossary edit left uncommitted from an unrelated earlier session will be swept into this run's terminal commit. This is the existing, deliberate `docs/**` trade-off, and the pre-commit visibility listing surfaces the exact paths before the authorization ask.
- The baseline's "MAY also include eligible documentation changes under `docs/**`" (`openspec/specs/sai-learnings-promotion/spec.md:82`) is raised to SHALL in this change, aligning the spec with the already-mandatory instruction language ("Include every changed path under `docs/**`", `sai/instructions/apply.md:361`) and with the scenario outcomes that require staging every eligible member. Docs and glossary eligibility are one rule, and the delta states them with one modal.
- The path is exactly the project-root `./GLOSSARY.md`; there is no change-folder fallback, per `openspec/specs/glossary-location/spec.md`.
- Behavior stays identical across Claude Code and opencode (Mirror discipline): the change touches only the shared `apply.md` body, the shared command body, the spec, and the test, so both harnesses inherit it unchanged.
