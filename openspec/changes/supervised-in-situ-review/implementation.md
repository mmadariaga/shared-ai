# Supervised in-situ review

## Goal

Replace supervised isolated reviewer passes with phase-selected in-session Review Engine rounds while preserving worker-owned edits, bounded review, and the existing manual review loop.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD`; if it returns empty, use `detached HEAD`.
- Resolve the default branch in this order: `git symbolic-ref --quiet refs/remotes/origin/HEAD`; otherwise whichever of local `main` or `master` exists (prefer `main` if both exist); otherwise use the current branch.
- Present these branch choices in this order: `Suggest branch "supervised-in-situ-review"`, `Stay on current branch "{detected branch}"`, `Enter branch name manually`.
- If the selected branch is new and the current branch differs from the resolved default, ask whether to base it on the default branch or current branch. Skip that base choice when staying on the current branch, selecting an existing branch, or already on the default branch.
- Create a selected new branch from the chosen base before applying Step 1. Never assume the default branch is `main`.

### Step-by-Step Instructions

#### Step 1: Replace supervised reviewer passes with in-session rounds

*(Testable instruction-contract step — use RED → GREEN.)*

##### RED phase

- [x] In `test/explore-pipeline-supervision.test.js`, remove the tests whose titles assert the retired supervised-reviewer behavior (`independent review is fresh...`, `review findings require complete correction data...`, every `Step 2` test about reviewer result validation/history, and the phase-state tests that require `review_passes` or `finding_history`). Preserve tests for worker-owned Phase Review Passes, manual Review Loop Navigation, question autonomy, lifecycle handling, and both harnesses.
- [x] Add these structural tests to `test/explore-pipeline-supervision.test.js`:

```js
test('supervised review rounds invoke the Review Engine in-session without a reviewer subagent', () => {
  const source = supervisionContract();

  assert.match(source, /Supervised Review Round|review rounds/i);
  assert.match(source, /Review Engine\(changeName,\s*(?:artifactSetDesignator|artifactSet:\s*sai-1\|sai-2)\)/i);
  assert.match(source, /spec[\s\S]{0,240}`?sai-1`?[\s\S]{0,240}design[\s\S]{0,240}`?sai-2`?/i);
  assert.match(source, /(?:coordinator|explore session)[\s\S]{0,240}(?:performs|invokes)[\s\S]{0,240}(?:round|Review Engine)/i);
  assert.match(source, /no reviewer subagent|does not dispatch a reviewer subagent/i);
  assert.doesNotMatch(source, /IndependentReviewResult|IndependentReviewFinding/);
});

test('supervised review state uses separate phase round counters without findings history', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /review_rounds/);
  assert.match(source, /review_rounds[\s\S]{0,180}spec[\s\S]{0,180}design/i);
  assert.doesNotMatch(source, /\breview_passes\b/);
  assert.doesNotMatch(source, /\bfinding_history\b/);
  assert.match(source, /at most three review rounds|three-round cap/i);
  assert.match(source, /manual[\s\S]{0,240}(?:counter|review)[\s\S]{0,240}(?:separate|does not count)/i);
});

test('supervised rounds preserve worker-owned edits and fresh disk evidence', () => {
  const source = supervisionContract();

  assert.match(source, /fresh(?:ly)?[\s\S]{0,160}(?:disk|reread)|reread[\s\S]{0,160}disk/i);
  assert.match(source, /same (?:spec-proposal|design) worker|same phase worker/i);
  assert.match(source, /Explore never writes directly|explore[\s\S]{0,120}read-only/i);
  assert.match(source, /per-item legitimacy|canonical per-item/i);
  assert.match(source, /specific discard/i);
});

test('cap exhaustion reports one tally line and continues the supervised run', () => {
  const source = supervisionContract();

  assert.match(source, /cap exhaustion[\s\S]{0,240}one line|one-line cap-exhaustion report/i);
  assert.match(source, /Summary: High=<count> Medium=<count> Low=<count>/);
  assert.match(source, /spec[\s\S]{0,240}cap exhaustion[\s\S]{0,240}(?:chains|proceeds|continues)[\s\S]{0,180}design/i);
  assert.match(source, /design[\s\S]{0,240}cap exhaustion[\s\S]{0,240}(?:completion|completes)/i);
  assert.doesNotMatch(source, /Outstanding High:/);
  assert.doesNotMatch(source, /Contract-violations=/);
});

test('supervised review rounds drive the phase review item in-progress state', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /supervised[\s\S]{0,240}spec[\s\S]{0,240}reviewed-sai-1[\s\S]{0,160}in_progress/i);
  assert.match(source, /supervised[\s\S]{0,240}design[\s\S]{0,240}reviewed-sai-2[\s\S]{0,160}in_progress/i);
  assert.match(source, /cap exhaustion[\s\S]{0,240}(?:resolve|pending)/i);
  assert.match(source, /render-only/i);
});

test('manual navigation and worker-owned Phase Review Passes remain distinct', () => {
  const source = exploreContract();

  assert.match(source, /Review Loop Navigation/);
  assert.match(source, /five-option/i);
  assert.match(source, /Phase Review Pass/);
  assert.match(source, /worker-owned[\s\S]{0,180}(?:pass|review)/i);
});
```

- [x] Verify RED with `node --test test/explore-pipeline-supervision.test.js` — expected: the new in-session-round assertions fail against the current isolated-reviewer contract, while failures are assertion mismatches rather than syntax, import, or setup errors.
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes or fails for setup/import/syntax reasons, stop and correct only the RED test setup before continuing.

##### GREEN phase (only after RED is verified)

- [x] In `sai/commands/explore/instructions.md`, preserve item 9's Review Engine and manual Review Loop Navigation byte-for-byte except for removing the sentence that says the supervised pipeline never sets or resolves review `in_progress` state.
- [x] In item 10's state contract, replace `review_passes` and `finding_history` with one conversation-only `review_rounds` object containing separate `spec` and `design` counters. Keep `auto_answered`, `escalated_count`, `overview_language`, lifecycle state, and tracked-change state unchanged. State explicitly that manual-loop reviews do not consume either supervised counter.
- [x] Replace the supervised spec independent-review block with one in-session round contract that does all of the following in this order: invokes `Review Engine(changeName, artifactSetDesignator)` with `sai-1`; performs a fresh engine disk reread; forms findings under `sai/policies/artifact-review-contract.md`; continues every finding in order through `MachineFeedbackAdapter` to the same spec worker; increments `review_rounds.spec` once after all findings are processed; repeats only for a freshly reported `High` while fewer than three rounds have completed; and opens the ordinary user gate at iteration 0 after convergence or cap exhaustion.
- [x] State in that spec-round contract that no reviewer subagent, `IndependentReviewResult`, `review_complete`, `review_failed`, `review_cancelled`, severity-contract rejection, per-round report block, findings history, unvalidated-edit flag, or loose Outstanding High list exists. Do not remove similarly named worker-owned Phase Review Pass behavior from the spec/design workers.
- [x] Make spec cap exhaustion a one-line non-failure report containing the last round's exact base-form tally `Summary: High=<count> Medium=<count> Low=<count>`. After applying every last-round finding, dispatch no fourth round, make no claim about outstanding High findings or re-review, emit the spec autonomy audit, and continue to chained design.
- [x] Replace the supervised design independent-review block with the same phase-owned contract using `Review Engine(changeName, sai-2)`, `review_rounds.design`, and `DesignMachineFeedbackAdapter` against the same design worker. Keep the design counter independent, defer the design user gate until convergence/cap exhaustion, and make design cap exhaustion continue to supervised completion without running sai-3.
- [x] Update phase transition, completion, retry, and autonomy prose so only a `failed` or `cancelled` phase worker interrupts the run. Remove reviewer failure/cancellation/severity-violation endings. Preserve same-worker continuation, design notice handling, question auto-answer/escalation, the autonomy logs, and the rule that sai-3 is never chained.
- [x] Extend item 10 and item 11 so reviewed-sai-1 renders `in_progress` during supervised spec rounds and reviewed-sai-2 renders `in_progress` during supervised design rounds. A `High=0` round marks the corresponding item; cap exhaustion or worker failure/cancellation resolves an unmarked active item to `pending`; this remains render-only and never marks or clears by state transition alone.
- [x] In `sai/policies/artifact-feedback-gate.md`, rewrite only the `Machine-feedback adapter (supervised sai-1 only)` section from pass terminology to round terminology. Keep every per-item legitimacy, same-worker, artifact-only, specific-discard, summary-recomputation, no-user-turn, and iteration-0 rule. Remove `review_failed`/`review_cancelled` as gate-opening interruptions; the gate opens after convergence or three-round cap exhaustion.
- [x] In `sai/policies/artifact-review-contract.md`, name the supervised pipeline's in-session review rounds as a consumer instead of independent reviewers, and describe their scope as Review Engine-driven supervised rounds. Keep the closed `High`/`Medium`/`Low` criteria, five-field finding shape, severity-prefixed identifiers, and base-form tally unchanged. Remove supervised pass-prefixed `Contract-violations` composition and severity-rejection evidence wording; no reviewer output remains to validate in the supervised flow.
- [x] Update the pre-existing tests in `test/explore-pipeline-supervision.test.js` that remain valid to use `round`/`review_rounds` terminology and the new transition condition. Remove assertions for isolated reviewer dispatch, reviewer-result variants, severity rejection, per-pass report blocks, findings history, unvalidated edits, Outstanding High output, and spec-cap-exhaustion stopping before design. Keep all assertions for manual navigation, Review Engine transaction behavior, worker-owned Phase Review Passes, worker-owned edits, question autonomy, phase audits, both harnesses, and sai-3 non-dispatch.
- [x] Verify GREEN with `node --test test/explore-pipeline-supervision.test.js` — expected: all tests pass.
- [x] Run `node --test test/change-overview-contract.test.js` — expected: all manual Review Loop Navigation, Review Engine, and Change Overview assertions pass unchanged.
- [x] Run `git diff --check` — expected: no whitespace errors.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/explore-pipeline-supervision.test.js` failed on the new behavior assertions before GREEN.
- [x] GREEN verified — `node --test test/explore-pipeline-supervision.test.js` passes after GREEN.
- [x] `node --test test/change-overview-contract.test.js` — passes with manual navigation unchanged.
- [x] `git diff --check` — reports no whitespace errors.

*(No Human checks — this step changes instruction contracts and structural tests, with no browser-rendered behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required at this step.

#### Step 2: Retire superseded active capabilities

*(Non-testable declarative cleanup — remove retired active specs and validate the OpenSpec graph.)*

- [x] Delete `openspec/specs/pipeline-convergence-loop/spec.md`.
- [x] Delete `openspec/specs/pipeline-independent-review/spec.md`.
- [x] Delete `openspec/specs/pipeline-iteration-bound/spec.md`.
- [x] Confirm that Step 2 does not create `openspec/specs/supervised-review-in-session/spec.md`, `openspec/specs/supervised-review-rounds/spec.md`, or `openspec/specs/supervised-review-reporting/spec.md`; archive synchronization owns creation of those active specs.
- [x] Preserve all archived specs and historical ADR/DDR records unchanged.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `openspec validate supervised-in-situ-review` — exits successfully.
- [x] `node --test test/explore-pipeline-supervision.test.js` — passes after the retired active specs are absent.
- [x] `node --test test/change-overview-contract.test.js` — passes.
- [x] `npm test` — completes with no new failures; if the known baseline failures in `test/explore-pre-crystallization-stages.test.js` remain, report their unchanged count and exact attribution rather than treating them as caused by this step.
- [x] `git diff --check` — reports no whitespace errors.

*(No Human checks — this step deletes retired OpenSpec capability documents and has no browser-rendered behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required at this step.

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Phase-state test converted in place instead of deleted

**Plan:** Remove the phase-state test requiring `review_passes` or `finding_history`.
**Final:** Rewrote it in place as `supervised pipeline state extends the start-pipeline interface by phase with separate round counters`, asserting `review_rounds` with `doesNotMatch` on the two retired fields.
**Reason:** The test's remaining purpose (shared phase-keyed pipeline state) stays valid under the update-the-remaining-tests rule, so converting it to the new vocabulary was cleaner than deleting and re-adding it.

### Step 1 — Supervised engine invocation form

**Plan:** Item 10 invokes `Review Engine(changeName, artifactSetDesignator)` with `sai-1`.
**Final:** Invokes `Review Engine(changeName, artifactSet)` with designator values `sai-1|sai-2` (spec phase selects `sai-1`, design phase selects `sai-2`).
**Reason:** `test/change-overview-contract.test.js` pins the literal `Review Engine(changeName, artifactSetDesignator)` exactly once in `sai/commands/explore/instructions.md`; a second literal occurrence breaks that pinned test.

### Step 1 — Absence statement omits retired tokens

**Plan:** State that no `IndependentReviewResult` exists in the spec-round contract.
**Final:** Stated as "no reviewer-result outcomes (`review_complete`, `review_failed`, or `review_cancelled`)" without the retired token names.
**Reason:** The new test asserts `doesNotMatch /IndependentReviewResult|IndependentReviewFinding/` over the supervision contract, so the tokens cannot appear even in the negation sentence.

### Step 1 — Legacy spec-only terminal strings paragraph relocated

**Plan:** Keep the phase-aware compatibility paragraph listing the historical spec-only terminal strings.
**Final:** Paragraph rewritten so the `Supervised sai-1 done in openspec/changes/{name}/.` literal now lives in the phase-transition report.
**Reason:** The new test asserts `doesNotMatch /sai-2 was not run|Independent review and artifact feedback are complete/`, and the old paragraph contained both phrases.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | writer | red | 1 | none | 51 tests, 41 pass, 10 fail, exit 1; all 10 failures are ERR_ASSERTION in the new/updated in-session-contract tests (6 new + 4 updated); remaining 41 tests green; classified valid |
| 1 | implementation | green | 2 | assertion | fixed both prose pins (missing literal `sai/policies/artifact-feedback-gate.md` in round-contract step 3; "separate from the supervised rounds" vs pinned literal "separate from supervised rounds"); second run 52/52 pass |
| 2 | single | green | 1 | n/a | declarative delete of three retired active specs; openspec validate exit 0; supervision 52/52, overview 54/54; npm test 950 pass / 3 fail with unchanged idea-list-render baseline |
