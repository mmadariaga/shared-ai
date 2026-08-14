**Complexity**: high (7 modified capabilities, 17 requirements, 8 affected paths)
<!-- First line of the file. Derive per `## Complexity Derivation Rubric` in sai/commands/spec/instructions.md, after specs/**/*.md are written. Optional trailing parenthetical, e.g. `medium (3 files, no breaking change)` — parsers ignore everything from the first `(`. Any change that adds content above `## Why` must re-anchor this line in openspec/specs/proposal-complexity/spec.md rather than displace it. -->

## Why

`sai-explore`'s pre-crystallization closure reminder was written for the old two-step flow and still names `crystallize` on every turn (`sai/commands/explore/instructions.md:114`), while the four-stage progression introduced `next-step` as the advancement token. A user who follows the stage-blind reminder skips the edge-case and implementation-details stages out of order, forces the edge-case review to fire prematurely (no skip path), and lands a block carrying `**Implementation Details**: - None` — meanwhile `next-step` at the `Crystallize` stage is a waiting-room turn with no effect.

## What Changes

- The closure reminder becomes stage-aware: at stages 1 and 2 it names `next-step`, at stage 3 it names both `next-step` and `crystallize` (retaining the existing literal), and at stage 4 no reminder is appended because entering the stage is itself the crystallization response.
- Advancing into the `Crystallize` stage counts as an explicit crystallize request, making `next-step` and `crystallize` equivalent from stage 3 and deleting the stage-4 waiting-room turn.
- The agreement questions of stages 2 and 3 name `next-step`, and semantic confirmation records the list and advances the stage within the same turn.
- An empty in-scope edge-case list at stage 2 records the agreed empty list and advances without the agreement question, mirroring stage 3's deterministic empty-set rule.
- The one-line readiness statement is folded into the closure reminder line rather than emitted separately, and no longer satisfies the actionable closure on its own.
- A materially changed idea resets the stage progression to `Explore change`.
- No breaking change and no new dependency; `sai-explore` stays read-only and stage state stays conversation-only.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Each becomes specs/<name>/spec.md. Use kebab-case. -->
- None

### Modified Capabilities
<!-- Existing capabilities whose requirements are changing. Leave empty if none. -->
- `explore-pre-crystallization-closure`: the closure reminder becomes conditional on the current stage of the four-stage progression instead of unconditionally naming `crystallize`
- `explore-pre-crystallization-stages`: entering the `Crystallize` stage is itself an explicit crystallize request; a materially changed idea resets the progression to `Explore change`; the edge-case empty-list advancement joins the deterministic exceptions
- `explore-closure-state`: the readiness statement no longer satisfies the closure on its own
- `explore-crystallization-on-demand`: the readiness statement is folded into the reminder line rather than emitted separately
- `explore-edge-case-review`: an empty in-scope edge-case list advances without the agreement question; the agreement question names `next-step` and agreement advances the stage in the same turn
- `explore-implementation-details`: the stage-3 confirmation question names `next-step`; confirmation completes the stage and advances within the same turn
- `explore-edge-case-gate`: deterministic empty edge-case recording is an explicit content-based agreement form; non-empty lists still require semantic user agreement

## Impact

- `sai/commands/explore/instructions.md` — the `Pre-crystallization closure (sai-explore only)` block (including the stage-blind reminder literal), the `Pre-crystallization staged progression` rules, the `Edge-case review gate`, and the `Implementation details stage` / `Crystallize stage` definitions.
- `openspec/specs/explore-pre-crystallization-closure/spec.md`, `openspec/specs/explore-pre-crystallization-stages/spec.md`, `openspec/specs/explore-closure-state/spec.md`, `openspec/specs/explore-crystallization-on-demand/spec.md`, `openspec/specs/explore-edge-case-review/spec.md`, `openspec/specs/explore-implementation-details/spec.md`, `openspec/specs/explore-edge-case-gate/spec.md` — each receives a synced delta at archive.
- No test file changes: `test/explore-pipeline-supervision.test.js` and `test/change-overview-contract.test.js` keep asserting the retained literal and the pinned closure-block sentences; `test/explore-pre-crystallization-stages.test.js` keeps asserting the `next-step` recognition sentences.

## Proposal Research Documentation

**Local files**: <!-- List every local file consulted during spec-phase codebase research -->
- `sai/commands/explore/instructions.md` (closure block :110–116, stage progression :56–60, edge-case gate :88–98, stage definitions :106–108, on-demand emission :100–104)
- `openspec/specs/explore-pre-crystallization-closure/spec.md`
- `openspec/specs/explore-pre-crystallization-stages/spec.md`
- `openspec/specs/explore-closure-state/spec.md`
- `openspec/specs/explore-crystallization-on-demand/spec.md`
- `openspec/specs/explore-edge-case-review/spec.md`
- `openspec/specs/explore-implementation-details/spec.md`
- `openspec/specs/explore-edge-case-gate/spec.md`
- `openspec/specs/explore-overview-language-gate/spec.md`
- `openspec/specs/localized-overview-generation/spec.md`
- `openspec/specs/spec-quality/spec.md`
- `openspec/specs/proposal-complexity/spec.md`
- `test/explore-pipeline-supervision.test.js`
- `test/change-overview-contract.test.js`
- `test/explore-pre-crystallization-stages.test.js`
- `GLOSSARY.md`
- `sai/policies/remember.md` (the follow-up-proposal prohibition cited by the closure requirement)

**External URLs**: <!-- List every external URL consulted during spec-phase codebase research -->
- None


## Additional Notes

- **Test-pinned source sentences**: the implementer must preserve these exact strings while rewriting the closure block in `sai/commands/explore/instructions.md`: the literal ``Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec` `` (asserted at `test/change-overview-contract.test.js:587` and `test/explore-pipeline-supervision.test.js:609`, to survive inside the stage-3 reminder); `When no genuine unresolved question remains, end with this concise reminder` (`change-overview-contract.test.js:586`); `fallback reminder repeats even after readiness has already been emitted` (`change-overview-contract.test.js:589`); the first sentence of the closure-state bullet, `The one-time readiness signal remains at most once per stable idea, does not transition the state, and does not suppress this rule`, which must be preserved verbatim (`change-overview-contract.test.js:591`, `explore-pipeline-supervision.test.js:605`) while the clause that follows it in the same bullet — `It satisfies the active closure only when the signal itself contains the required `crystallize` reminder and the paste-ready `/sai-1-spec` outcome; otherwise the actionable closure remains required.` — is the readiness-satisfies-closure clause this change deletes; and `Do not append the pre-crystallization question-or-reminder closure to that crystallization response` (`change-overview-contract.test.js:622`). The stage-1/2 reminder wording is unpinned.
- The envelope's research lead `test/change-overview-contract.test.js:550` was stale: the closure-literal assertions live at lines 582–622, with the literal at line 587. The envelope's claim that both test files assert the literal is confirmed (587/609), and the envelope's decision to retain the literal stands — both files keep passing without rewrites.
- The readiness statement is folded into the reminder line while the test-pinned sentence keeps the words "readiness signal" in the closure-state bullet; the source may keep that noun while the maturity judgment is carried inside the reminder line.
- Overview language: the envelope's `Overview language: Español` governs the `change-overview.md` projection during `/sai-2-design` (`localized-overview-generation`); the proposal and specs remain English per that capability's contract.
- `--fast-track` continues to bypass only the two language gates; it never skips, weakens, or auto-completes any stage. The mandatory edge-case gate remains in force and is amended only to recognize exact deterministic empty-set recording as its sole content-based agreement form.
