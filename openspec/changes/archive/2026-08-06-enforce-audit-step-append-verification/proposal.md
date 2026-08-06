**Complexity**: medium (1 new + 2 modified capabilities, no breaking change)

## Why

The append of audit-derived steps is the only phase of `/sai-3-implement` with no output verification: neither the plan's pre-delivery checklist (`sai/instructions/implement.md` Pre-Delivery Verification) nor the implementation-planning worker's completion gate (`sai/orchestration/workers/sai-3-implementation-worker.md` lines 47-51) checks that the current invocation appended the steps it was required to append, so a worker can return `completed` having skipped the append entirely without violating its own contract. The obligation is also stated twice in the instruction — `sai/instructions/implement.md:63` as a forward reference with no execution point, and `sai/instructions/implement.md:196` as the actual site — which lets the first mention be read as discharging the second. Observed in a runtime where a Sai-3 re-run preserved every compacted step correctly but appended no step for an existing `review.md`, and emitted none of the chat confirmation required by `sai/instructions/implement.md:204` — and still completed.

## What Changes

- Add an audit-append output invariant to the pre-delivery checklist in `sai/instructions/implement.md` (Pre-Delivery Verification) and to the implementation-planning worker's completion gate in `sai/orchestration/workers/sai-3-implementation-worker.md`. The invariant is a two-stage design: the pre-delivery self-check verifies and **repairs** a missing append before delivery; the worker gate is the last resort that fails only if a required append is still missing at completion time. Both stages evaluate scoped to **what the current invocation appended**, not to what `implementation.md` contains — because the re-run contract appends one new step per artifact on every re-run with no dedup, a contents-based check would be satisfied trivially by a step appended in an earlier round. To make the predicate evaluable, both stages key on a run-path baseline: on the first-run path, the highest `#### Step N:` number in the generated plan (the plan produced by the current run before the audit steps are appended); on the re-run path, the highest `#### Step N:` number present in `implementation.md` at the start of the invocation, captured before any write. An appended step must be numbered strictly after that baseline. The chat confirmation of the existing "Discarded findings SHALL be surfaced in chat for conversational confirmation" requirement stays a plain conversational obligation of every appended step, deliberately NOT part of the enforced verification: that requirement is conversational-only by design (no approval key is written), so no durable record exists for either stage to check, and a verification clause over it would reduce to the agent's self-report — the change's own failure class.
- Collapse the duplicated append statement at `sai/instructions/implement.md:63` into a reference to the single execution site (Step 5, "Append audit-derived steps"), so the audit artifacts are still read during parsing while only the append description lives at its execution site.
- Fix the Step 3 ADR ask-vs-create ordering at `sai/instructions/implement.md:95`: the project-maintained-ADR branch moves before the ask branch, matching `sai/instructions/spec.propose.md`'s "already has an ADR culture or the user explicitly approves" rule — the same positional-weakness defect observed in the same runtime. Given a normative home in a new `adr-creation-decision` capability delta, because the existing `adr-index-maintenance` capability's scope starts after creation.

## Capabilities

### New Capabilities

- `adr-creation-decision`: add a requirement pinning the Step 3 ask-vs-create ordering — the project-culture check precedes the ask, direct creation when the project maintains ADRs/DDRs, ask + explicit approval otherwise. Placed in its own capability because `adr-index-maintenance`'s scope begins after creation.

### Modified Capabilities

- `audit-artifact-ingestion`: add a requirement that the append of audit-derived steps is verified before the plan is delivered — the pre-delivery self-check that repairs a missing append, evaluated against the run-path baseline (generated plan on first run, start-of-invocation capture on re-run). The existing chat confirmation remains a plain conversational obligation, not part of the enforced verification (it is conversational-only by design).
- `implementation-planning-worker`: extend the existing Durable artifact verification requirement so `completed` is unreachable when an audit artifact exists and this invocation appended no corresponding step even after the pre-delivery self-check.

## Impact

Affected files:

- `sai/instructions/implement.md` — Pre-Delivery Verification checklist (new audit-append invariant bullet); Step 2 audit exception (line 63, collapse the duplicated append description to a reference to Step 5); Step 3 ADR ordering (line 95, branch reorder).
- `sai/orchestration/workers/sai-3-implementation-worker.md` — completion gate (lines 47-51, add the audit-append check to the durable verification list).
- `openspec/changes/enforce-audit-step-append-verification/specs/audit-artifact-ingestion/spec.md` — delta spec (ADDED requirement).
- `openspec/changes/enforce-audit-step-append-verification/specs/implementation-planning-worker/spec.md` — delta spec (MODIFIED requirement).
- `openspec/changes/enforce-audit-step-append-verification/specs/adr-creation-decision/spec.md` — delta spec, new capability (ADDED requirement).

Explicitly not touched:

- Bindings (`sai/orchestration/workers/bindings/`), coordinators (`sai/commands/implement/`), agent definitions (`agents/claude/sai-3-implementation-worker.md`), `sai/install-manifest.json`, and all test files. Existing worker assertions (`test/implement-coordinator-worker.test.js:461-469`) cover prerequisites and picker behavior only, so an added completion-gate item does not break them.
- No dedup or idempotency logic is added for audit steps across re-runs; the Judgment Rubric, the Apply/Discard classification, and the chat-confirmation mechanics are unchanged.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/implement.md` — append execution site (lines 196-208, incl. the no-dedup rule), pre-delivery checklist (lines 245-256), duplicated forward reference (line 63), ADR ordering (line 95)
- `sai/orchestration/workers/sai-3-implementation-worker.md` — completion gate (lines 47-51)
- `sai/orchestration/worker-lifecycle.md` — shared lifecycle and closed outcomes
- `sai/commands/spec/invocation.md` — spec invocation core
- `sai/instructions/spec.propose.md` — quality layer, complexity rubric
- `sai/policies/glossary-format.md`, `sai/policies/remember.md` — glossary format and phase policies
- `openspec/specs/audit-artifact-ingestion/spec.md` — normative append and re-run requirements (lines 92-119)
- `openspec/specs/implementation-planning-worker/spec.md` — durable-verification requirement (lines 52-61)
- `openspec/specs/adr-index-maintenance/spec.md` — ADR index-maintenance cycle, scoped to maintaining the index after creation; confirmed it does not own the ask/create decision, so the decision gets its own capability instead
- `test/implement-coordinator-worker.test.js` — worker assertions (lines 430-469)
- `GLOSSARY.md` — pipeline domain language (no new terms resolved)
- `openspec/changes/archive/2026-06-20-sai-3-rerun-preserve-compacted/proposal.md` — origin of the re-run preservation contract
- `openspec/changes/archive/2026-07-02-audit-finding-judgment/proposal.md` — prior audit-ingestion change history
- `openspec/config.yaml` — schema prerequisite

**External URLs**: None.

## Additional Notes

- The invariant deliberately keys on what the current invocation appended, not on file contents: `sai/instructions/implement.md:208` mandates one new step per artifact on every re-run with no dedup, so a contents-based check would pass on a step appended in an earlier round.
- The predicate is defined against a run-path baseline, mirroring the instruction's two baselines: the first-run path keys on the highest `#### Step N:` number in the generated plan (the plan produced by the current run before the audit steps are appended, per `sai/instructions/implement.md:160`); the re-run path keys on the highest `#### Step N:` number present in `implementation.md` at the start of the invocation, captured before any write (per `sai/instructions/implement.md:200`). A step satisfies the check only when numbered strictly after that baseline. This makes "appended by THIS invocation" evaluable at verification time on both paths.
- Two-stage design: the pre-delivery self-check repairs a missing append; the worker gate is the last resort and fails only if the append is still missing at completion time. The two stages name each other so an implementer sees a single run order, not contradictory directives.
- The chat confirmation of the existing "Discarded findings SHALL be surfaced in chat for conversational confirmation" requirement is deliberately NOT part of the enforced verification, in either stage: that requirement is conversational-only by design (the agent SHALL NOT write any approval key, and `implementation.md` carries no trace of a chat emission), so a verification clause over it would reduce to the agent asserting it emitted a message earlier in the same run — the exact failure class this change exists to close. It remains the plain obligation it already is; the Why's observed missing confirmation is closed by the append check (the run appended nothing, so the append invariant fails first).
- Trade-off accepted: a worker that appends an audit step but classifies its findings poorly still passes the gate — the invariant checks presence, not judgment quality.
- The Step 3 ADR ordering fix rides in the same change despite being a separate rule: it is the same positional-weakness defect observed in the same runtime and touches one adjacent line (per the change request's accepted trade-offs). It is normatively specified in a new `adr-creation-decision` capability delta so the declared behavior has a normative home; `adr-index-maintenance` is untouched because its scope begins after creation.
- Non-goals (per change request): no dedup/idempotency logic for audit steps across re-runs; no change to the Judgment Rubric, Apply/Discard classification, or chat-confirmation mechanics (the chat confirmation remains the existing conversational obligation, unchanged and unenforced; the invariant never verifies it).
- No `GLOSSARY.md` update: the change resolves no new domain term and challenges no ambiguity — "audit artifact" and "audit-derived step" are used consistently across the sources above.
- Pre-existing drift, not introduced here: `openspec/specs/audit-artifact-ingestion/spec.md` already carries a duplicated requirement heading — :24 "Audit artifact steps MUST NOT be merged with existing implementation steps." and :90 the same text without the trailing period. This change's delta merges into that file at archive time; the duplicate is flagged for awareness and left untouched (main-spec edits are out of sai-1 scope).
