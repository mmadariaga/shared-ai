**Complexity**: high (4 capabilities, 5 requirements, no breaking change, no new dependency)

## Why

The POC-lane / review-close rollout (commit range `1d87ee52..cf19ad66`) moved the technical-uncertainty axis out of the crystallization-time slicing assessment and into a conditional POC stage that runs between `Explore change` and `Review edge cases`, but four main specs were never updated and now assert behavior the shipped instructions contradict. This is a record-only reconciliation: every requirement below restates behavior that already shipped, so the specs stop disagreeing with `sai/commands/explore/steps/**` and with the already-reconciled `explore-vertical-slicing` capability.

## What Changes

- `explore-pre-crystallization-stages` — the `Crystallize` stage requirement stops ordering a third "technical-uncertainty assessment" and an uncertainty pause at stage 4. It records the shipped two-judgment sequence (size, then integration-point friction) before the crystallization language gate, with gate 9 still deferred to the later supervised Plan (unattended) activation. All six scenarios are carried; only retired vocabulary is reworded.
- `explore-refactor-first-slicing` — the friction-assessment requirement stops claiming that uncertainty is assessed after friction and that a successful POC causes size and friction to be re-evaluated against a post-POC integration site. Because the lane abandons its own branch or worktree, no POC code survives into the assessment, so friction judges the original repository. All four scenarios are carried; the POC scenario's body is replaced while its heading stays verbatim (see Additional Notes).
- `sai-fast-track-flag` — two requirements. The per-command opt-out requirement names the POC lane's three stops in current vocabulary instead of the retired "technical-uncertainty pause / Ask 1 / viable and not-viable post-POC choices". The merge requirement records the pre-existing method pinning (method pinned to `merge`, no squash choice) alongside the runtime resolution scope question, so this spec and `method-selection` agree.
- `explore-context-isolation` — restores an assertion the rollout dropped without replacement: no route dispatches merely because the idea is ready or the POC trigger fired.
- No semantic change anywhere: fast-track still never auto-approves or skips any POC-lane stop, and no new behavior is introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `explore-pre-crystallization-stages`: the `Crystallize` stage runs two assessments (size, friction) with no uncertainty assessment and no uncertainty pause.
- `explore-refactor-first-slicing`: technical uncertainty is not assessed here or after friction, and friction is never re-evaluated against a post-POC integration site.
- `sai-fast-track-flag`: the `sai-explore` opt-out exclusion is stated as the lane's three stops, and merge fast-track's audited opt-out list records the method-selection gate.
- `explore-context-isolation`: route authorization is explicit — readiness or a fired POC trigger dispatches nothing.

## Impact

- Affected artifacts: `openspec/specs/explore-pre-crystallization-stages/spec.md`, `openspec/specs/explore-refactor-first-slicing/spec.md`, `openspec/specs/sai-fast-track-flag/spec.md`, `openspec/specs/explore-context-isolation/spec.md` — reached by `openspec archive` sync, plus the two post-sync scenario-heading renames noted below.
- Affected code: none. No `sai/**` runtime file, command card, or state machine changes; the `explore-idea@1` machine and the command cards were already delivered in `bf4ff021` and `543cf5ea`.
- Downstream: readers of these four capabilities (review, audits, future explore work) stop being handed contradictory statements about where the uncertainty axis lives.

## Proposal Research Documentation

**Local files**:
- `sai/commands/explore/steps/slicing-assessment.md` (lines 3, 5, 31 — two assessments, "Technical uncertainty is **not** assessed here", the stage-4 paragraph)
- `sai/commands/explore/steps/poc-lane.md` (lines 1, 13, 19, 21, 23, 25–28 — the three stops, reversible isolation, verdict vocabulary, verdict menu)
- `sai/commands/explore/steps/common.md` (lines 19, 26, 31, 33, 35, 37, 93 — POC trigger, go/no-go picker, late explicit entry, agreed lists survive the lane, conditional POC entry)
- `sai/commands/merge/instructions.md` (lines 31–34 — `--fast-track` pins the method to `Merge` and shows no squash choice)
- `openspec/specs/explore-vertical-slicing/spec.md` (lines 11, 25 — the already-reconciled two-orthogonal-judgments wording these deltas must agree with)
- `openspec/specs/method-selection/spec.md` (lines 17–21 — `Requirement: Fast-track method pinning`)
- `openspec/specs/explore-pre-crystallization-stages/spec.md`, `openspec/specs/explore-refactor-first-slicing/spec.md`, `openspec/specs/sai-fast-track-flag/spec.md`, `openspec/specs/explore-context-isolation/spec.md` (the four stale targets)

**External URLs**: None.

## Additional Notes

- **Current vocabulary used throughout** — the **POC trigger** evaluated at the close of the `Explore change` stage and its **go/no-go** ask (retired: "technical-uncertainty pause", "Ask 1"); the **`C1..Cn` candidate-list agreement**; the **verdict menu** with its `<Cn> wins` and `none` branches (retired: "viable post-POC choices", "not-viable post-POC choices", the `Crystallize full` menu option).
- **Requirement headings kept verbatim.** `### Requirement: Merge fast-track bypasses only runtime scope` no longer reads perfectly truthfully once the method-selection gate joins its audited opt-out list, but the heading is deliberately preserved: renaming a requirement makes the delta an ADDED requirement plus a removal, which destroys the old text at sync and leaves an orphan in the main spec. The normative content lives in the requirement body, which is corrected. The same reasoning keeps every other requirement heading byte-identical, so all four deltas validate as MODIFIED.
- **Scenario headings kept verbatim in the delta, renamed after sync.** Two scenario headings carried retired or now-false wording: `#### Scenario: viable POC re-evaluates the integration point` (`explore-refactor-first-slicing`) and `#### Scenario: Ask 1 POC has narrowed authority` (`explore-context-isolation`). `openspec validate --strict` rejects renaming either one inside a delta — it matches scenarios by heading and reads a rename as a dropped scenario that archive would destroy — so both stayed byte-identical through sync and only their bodies were corrected. That left the first heading stating the opposite of the behavior its own body specifies. Once the deltas were synced the constraint no longer applied, so both headings were renamed directly in the main specs, as part of this change: `an earlier POC does not re-evaluate the integration point` and `the accepted POC has narrowed authority`.
- **Scenario preservation.** A delta replaces the whole requirement block at sync, so each MODIFIED requirement here carries its complete existing scenario set: six for the `Crystallize` requirement, four for the friction requirement, three for the per-command opt-out requirement, one for the merge requirement, and two for the route-authorization requirement.
- **Confirmed out-of-scope drift.** `openspec/specs/explore-vertical-slicing/spec.md:75` still carries the retired `Crystallize full` wording inside `#### Scenario: sliced feature crystallizes` ("any required uncertainty pause has completed with either a viable `Crystallize full` or an explicit POC decline"). It is real and stale, but it belongs to a capability outside this change's scope and is left untouched here.
- **Dropped assertion deliberately not restored.** The rollout also dropped `- **AND** explore performs no direct write` from `#### Scenario: route authorization is explicit`. It is already restated by the surrounding requirement text and by `explore-context-preserved`, so it is not restored.
- **No glossary change.** `GLOSSARY.md` carries no POC-lane term today, and this change resolves no new domain term — the vocabulary it uses is already defined in the shipped instruction files.
