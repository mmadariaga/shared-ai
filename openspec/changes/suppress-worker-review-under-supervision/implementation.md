# suppress-worker-review-under-supervision

## Goal

Suppress the automatic worker-owned planning-artifact review loop when `--supervised` is present, forward that marker from explore Auto (including design-phase retry), raise supervised in-session rounds to three per phase per Auto attempt, and align main specs, policies, and contract tests.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "suppress-worker-review-under-supervision"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Spec worker leading-flag grammar and conditional automatic review

*(Service-side / non-UI step — instruction markdown only. No RED/GREEN.)*

- [x] Edit `sai/commands/spec/worker.md` **Invocation Envelope** section. Keep the two-string envelope and wrapper-echo precedence. After selecting the source (trimmed non-empty `wrapper_echo_value` else `arguments_value`), add leading line-wise `--supervised` stripping **before** change resolution / request finalization.

Replace the Invocation Envelope body (lines 6–8) with:

```markdown
## Invocation Envelope

The worker receives exactly two strings: `wrapper_echo_value` and `arguments_value`. Use trimmed non-empty wrapper echo before arguments as the **selected source**. Do not introduce a third envelope field.

**Leading supervised-flag grammar (after source selection):** On the selected source only, walk lines from the start and repeatedly strip each leading line whose trimmed content equals exactly the bare string `--supervised` (no value). Set invocation-scoped `supervised: true` if at least one such line was consumed; otherwise `supervised: false`. The first line that is not such a flag opens the verbatim request inclusive; from that point on, no further flag parsing occurs — a later line or substring `--supervised` inside the request body is request content, not a flag. If after stripping only flag lines the remaining request is empty or whitespace-only, fail validation before change resolution (empty request) with a clear `failed` summary. Build any reviewer reference set from this flag-stripped request so reviewers never receive the `--supervised` line.

If both envelope values are empty after selection rules, run `openspec list --json` and apply the established zero/one/multiple picker: no changes fails; one asks `Use change '{name}'?` with ordered yes/no options; multiple asks `Which change?` with CLI-order options and repeats invalid input without a retry cap. Do not scan parent conversation history. Do not verify dispatcher provenance of the marker.
```

- [x] Condition the `### Worker-owned planning-artifact review` section so the automatic loop runs only when `supervised` is false. Replace the opening paragraph of that section (currently starting "After `proposal.md` is non-empty…") with:

```markdown
### Worker-owned planning-artifact review

**Automatic-loop gate:** When invocation-scoped `supervised` is true, do **not** dispatch any automatic isolated reviewer, do **not** advance either automatic-loop counter (completed-pass count and total-attempt count both remain 0), do **not** emit an automatic-path `review` progress event, and leave the `review` plan step unmarked by the automatic path. Proceed to the ordinary pre-gate terminal lifecycle after pre-completion verification and decision-summary derivation. Suppression covers the automatic loop only.

When `supervised` is false, after `proposal.md` is non-empty, at least one non-empty `specs/**/*.md` exists, all pre-completion verification and source-grounding checks pass, the decision summary is derived, and the `validation` progress event has been emitted, run the automatic review loop before returning the pre-gate terminal `completed`.
```

- [x] Keep the remainder of the review section (pass isolation, counters, caps, High=0 mark) for the non-suppressed path. Replace the final coexistence paragraph with:

```markdown
After the automatic loop settles — or when it was suppressed without running — retain the coordinator-owned prose feedback gate unchanged. A user-requested pass from that gate uses the same fresh isolation, reviewed/reference sets (flag-stripped request), finding contract, worker-owned processing, and evidence semantics, and is subject to neither automatic-loop cap; the marker does not block, cap, or reclassify a user-requested pass. On the non-supervised path the worker-owned loop coexists with and never replaces the supervised pipeline's in-session rounds or its `MachineFeedbackAdapter`. On the supervised path the automatic worker-owned loop does not run; in-session rounds are the sole automatic convergence mechanism.
```

- [ ] Do **not** amend the declared progress plan step list. Do not touch boot adapters or coordinators.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n "supervised|leading|--supervised" sai/commands/spec/worker.md` — shows flag grammar and automatic-loop gate
- [x] `rg -n "third envelope|wrapper_echo_value" sai/commands/spec/worker.md` — two-string envelope retained
- [x] Manual read: empty-after-strip fails before resolution; in-body `--supervised` not stripped; reference set excludes marker

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Design worker name-first `--supervised` and conditional automatic review

*(Service-side / non-UI step — instruction markdown only. No RED/GREEN.)*

- [x] Edit `sai/commands/design/worker.md` **Prerequisites and Resolution** flag parsing (line 18 region). Extend recognized flags to include bare `--supervised` alongside `--fast-track` and `--overview-lang <language>`.

After the existing `--overview-lang` / `--fast-track` parse rules, ensure this behavior is stated explicitly (merge into the parse paragraph, do not duplicate conflicting rules):

```markdown
Also scan the selected envelope source for the bare flag `--supervised` (no value). If present once or more, set invocation-scoped `supervised: true` and remove every bare `--supervised` token before change-name resolution; if absent, `supervised: false`. The flag is order-independent among flags after the change name (accept `{name} --fast-track --supervised`, `{name} --supervised --fast-track`, and compositions with `--overview-lang <language>`). Never persist `supervised`. Do not require `--supervised` to be the first token. Do not verify dispatcher provenance.
```

- [x] Condition `### Worker-owned planning-artifact review` exactly parallel to Step 1. Replace the opening paragraph with:

```markdown
### Worker-owned planning-artifact review

**Automatic-loop gate:** When invocation-scoped `supervised` is true, do **not** dispatch any automatic isolated reviewer, do **not** advance either automatic-loop counter, do **not** emit an automatic-path `review` progress event, and leave the `review` plan step unmarked by the automatic path. Proceed to the ordinary pre-gate terminal after `interfaces` verification and decision-summary derivation.

When `supervised` is false, after `design.md`, `tasks.md`, and `interfaces.md` are non-empty and verified, the decision summary is derived, and the `interfaces` progress event has been emitted, run the automatic review loop before returning the pre-gate terminal `completed`.
```

- [x] Replace the final coexistence paragraph of that section with:

```markdown
After the automatic loop settles — or when it was suppressed without running — retain the coordinator-owned prose feedback gate unchanged. A user-requested pass from that gate uses the same isolation, finding, processing, and evidence rules without either automatic-loop cap; the marker does not condition it. Later feedback edits or High findings never clear or reopen an emitted `review` mark. On the non-supervised path the worker-owned loop coexists with and never replaces the supervised pipeline's in-session rounds or its `MachineFeedbackAdapter`. On the supervised path the automatic worker-owned loop does not run. Under supervision the design worker marks no routed-list steps: no adapter-declared plan, no plan-based list, no step marking.
```

- [ ] Do not touch overview lifecycle, boot adapters, or coordinator bodies.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n "--supervised|supervised:" sai/commands/design/worker.md` — flag recognized and gate present
- [x] Confirm overview lifecycle paragraphs and `overview_language` transport are unchanged
- [x] Manual shapes: `{name} --fast-track --supervised` and with `--overview-lang {lang}` both valid

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Pin supervised Auto envelopes (including design-retry) before instruction edit

*(Testable contract pins — RED first against pre-Step-4 production. GREEN is the pin file itself; suite must fail on the new pins until Step 4.)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste production explore instruction edits here.

- [x] Append the following new tests to `test/explore-pipeline-selector.test.js` (after the existing supervised-design worker-owned review tests ~line 704, before the in-session review rounds section). Do not edit `sai/commands/explore/instructions.md` in this step.

```javascript
// ─── suppress-worker-review-under-supervision: Auto envelope pins (verify-first) ─

test('Auto spec envelope carries leading --supervised with empty wrapper echo', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(
    source,
    /wrapper_echo_value:\s*""\s*\n\s*arguments_value:[\s\S]{0,80}--supervised/,
    'spec Auto dispatch should leave wrapper_echo_value empty and put --supervised on arguments_value'
  );
  assert.match(
    source,
    /arguments_value:[\s\S]{0,200}--supervised[\s\S]{0,200}Ready to Propose|arguments_value[\s\S]{0,120}line `--supervised`[\s\S]{0,200}Ready to Propose/i,
    'spec arguments_value should begin with --supervised ahead of the Ready-to-Propose body'
  );
  assert.doesNotMatch(
    source,
    /wrapper_echo_value:\s*"--supervised"/,
    'explore must not carry the marker as a bare non-empty wrapper echo'
  );
});

test('Auto chained design envelope carries --fast-track and --supervised', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(
    source,
    /arguments_value:\s*"\{name\} --fast-track --supervised"/,
    'chained design Auto envelope should be {name} --fast-track --supervised'
  );
  assert.match(
    source,
    /arguments_value:\s*"\{name\} --fast-track --supervised --overview-lang \{overview_language\}"/,
    'language-bearing chained design should compose --supervised with --overview-lang'
  );
});

test('design-phase retry carries --supervised and does not re-run sai-1', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(
    source,
    /design-phase retry[\s\S]{0,800}--supervised|retry[\s\S]{0,400}--supervised[\s\S]{0,400}design/i,
    'design-phase retry must carry --supervised'
  );
  assert.match(
    source,
    /design-phase retry[\s\S]{0,500}never dispatch sai-1|never[\s\S]{0,80}regenerate `proposal\.md`|does not re-dispatch the sai-1/i,
    'design-phase retry must not re-dispatch sai-1 or regenerate proposal/specs'
  );
});
```

- [x] Verify RED: run `node --test test/explore-pipeline-selector.test.js` — expected: **assertion failure** on at least one of the three new pins against current production (which still uses `arguments_value: "<Ready to Propose block>"` without `--supervised` and design `{name} --fast-track` without `--supervised`). Failure must be assertion mismatch, not a syntax/import error.
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If all three new pins already pass against production, stop and report: production already matches envelope shapes — Step 4 must still not drop them.

##### GREEN phase (only after RED is verified)

- [x] No additional production code in this step. GREEN is the committed pin file. Confirm the three tests remain in the suite and fail for the intended assertion reasons (or all pass only if production already matches).

- [x] Verify GREEN intent: `node --test test/explore-pipeline-selector.test.js` still documents the verify-first gate (RED failures are expected until Step 4). Record which pins failed.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — new pins fail (or already green with note) against pre-Step-4 production
- [x] Pin file has no syntax errors (`node --check test/explore-pipeline-selector.test.js`)
- [x] `sai/commands/explore/instructions.md` is **unchanged** in this step (`git diff -- sai/commands/explore/instructions.md` empty for this step's commit)

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Explore Auto forwarding, three-round wording, and attempt counter reset

*(Service-side / non-UI step — instruction markdown only. No RED/GREEN. Turns Step 3 pins green.)*

- [ ] Edit `sai/commands/explore/instructions.md` item 10 state: extend the `review_rounds` bullet (~line 254) so counters reset per Auto attempt:

```markdown
- `review_rounds`: one conversation-only object with separate `spec` and `design` counters for the supervised in-session review rounds; manual-loop reviews (item 9) are separate from supervised rounds and do not count toward either counter. Reset both `review_rounds.spec` and `review_rounds.design` to `0` at the start of each new Auto attempt for the selected change. Rounds from an earlier failed or cancelled attempt do not count against the new three-round bound.
```

- [ ] Replace the routed spec supervision envelope (~lines 279–282) with:

```yaml
    wrapper_echo_value: ""
    arguments_value: |
      --supervised
      <the complete emitted Ready to Propose block for the selected change>
```

And update the prose immediately below so it states: `arguments_value` is the line `--supervised`, a newline, then the complete Ready-to-Propose block; after the spec worker's line-wise flag strip the verbatim request is still that full block; empty wrapper echo is mandatory so echo precedence never discards the body.

- [ ] Replace the in-session supervised review rounds (spec phase) paragraph (~line 305) and step 5–6 wording (~311–313, 319) so that:
  - Cap is **at most three** completed in-session rounds per phase per Auto attempt (not one).
  - Remove any "heavy convergence work already ran inside the worker-owned isolated review loop" / "single in-session cross-check" justification.
  - High findings **extend** while fewer than three rounds have completed; third-round High is non-failure cap exhaustion.
  - Under supervision, in-session rounds are the **sole automatic** convergence mechanism (worker-owned automatic loop suppressed via `--supervised`).
  - Worker-owned Phase Review Pass remains available on standalone paths without the marker; under supervision the automatic worker-owned loop does not run.
  - Gate opens after convergence **or three-round cap exhaustion** (not "one-round cap").
  - Failed/cancelled mid-round: later Auto starts a **new three-round bound** with counters at zero (not one-round).

Concrete replacement for the opening paragraph of the spec in-session rounds block:

```markdown
    **In-session supervised review rounds (spec phase)**: Only after the worker has generated a non-empty `proposal.md` and at least one generated file under `specs/**`, start the spec phase's in-session supervised review rounds, held in conversation only and never written to an artifact. The contract allows at most three review rounds per phase per Auto attempt; `review_rounds.spec` counts completed rounds for the current attempt and was reset to 0 when this Auto attempt started. Under supervision the worker-owned automatic review loop is suppressed by the `--supervised` marker, so these in-session rounds are the sole automatic convergence mechanism for the phase — not a single cross-check layered on a co-running worker-owned loop. This in-session round contract remains distinct from the worker-owned Phase Review Pass on standalone (non-`--supervised`) invocations.
```

Replace step 5 of the round procedure (~line 312) with:

```markdown
    5. After incrementing the counter: if the round reported no `High` findings, converge (dispatch no further round). If the round reported at least one `High` finding and `review_rounds.spec` is still below 3, dispatch a further round after machine-feedback processing. If the round is the third completed round and still reports at least one `High` finding, close as non-failure cap exhaustion (dispatch no further round). `Medium` and `Low` findings remain processed and visible but never alone extend the loop; if accepted non-blocking edits changed artifacts during a no-`High` round, report that the last reviewed state contained no `High` findings, that the resulting artifact state was not re-reviewed, and make no convergence claim about the edited state.
```

Replace step 6 trigger language: `one-round cap` → `three-round cap`.

Replace failed-worker retry sentence: `new one-round bound` → `new three-round bound with phase counters reset to zero`.

- [ ] Replace chained design envelopes (~lines 337–347) with:

```yaml
        wrapper_echo_value: ""
        arguments_value: "{name} --fast-track --supervised"
```

and language-bearing:

```yaml
        wrapper_echo_value: ""
        arguments_value: "{name} --fast-track --supervised --overview-lang {overview_language}"
```

- [ ] In **Phase-aware dispatch** design-phase retry prose (~line 275), state explicitly that design-phase retry uses the same design envelope shape including `--supervised` (never omits the marker), resumes design only over existing reviewed `proposal.md`/`specs/**`, and never re-dispatches sai-1 or regenerates proposal/specs that would overwrite accepted corrections.

- [ ] Align design-phase in-session rounds (~359–363) to the same three-round extend-while-cap-permits model and remove one-round wording.

- [ ] Manual path: confirm Manual still injects no `--supervised`, no `--fast-track`, no `--overview-lang` from the supervised path.

- [ ] Re-run Step 3 suite: `node --test test/explore-pipeline-selector.test.js` — Step 3 envelope/retry pins must pass.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `node --test test/explore-pipeline-selector.test.js` — Step 3 envelope/retry pins green
- [ ] `rg -n "heavy convergence|at most one review round|one-round cap" sai/commands/explore/instructions.md` — no live one-round supervised-cap pins remain in item 10
- [ ] `rg -n "--supervised" sai/commands/explore/instructions.md` — present on spec, chained design, and retry paths
- [ ] `rg -n "reset.*review_rounds|review_rounds.*reset" sai/commands/explore/instructions.md` — attempt reset documented

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 5: Shared policy enumeration and deferred-gate trigger

*(Service-side / non-UI step — two confined policy sentence edits. No RED/GREEN.)*

- [ ] Edit only the opening surface enumeration of `sai/policies/artifact-review-contract.md` line 3. Replace the current sentence that lists surfaces unconditionally with conditional automatic worker-owned loop wording. Severity body, finding shape, identifier scheme, and tally form must remain byte-identical.

Replace line 3 with:

```markdown
Single source of the artifact review finding contract. Every artifact review surface — the manual `sai-explore` post-crystallization review loop, the supervised pipeline's in-session review rounds (Review Engine-driven), and the automatic worker-owned planning-artifact review loop on the spec and design workers when the invocation does **not** carry the `--supervised` marker (user-requested worker-owned passes at the prose feedback gate remain bound even when the marker is present) — SHALL draw its finding format from this contract by reference. Neither `sai/commands/explore/instructions.md` nor any capability spec other than `review-finding-format` SHALL redefine the severity criteria, the finding shape, the identifier scheme, or the summary-line format inline; consuming instructions and capability specs SHALL cite this contract by reference. These semantics SHALL NOT be restated in explore or reviewer instructions.
```

- [ ] Edit only the deferred-gate exhaustion trigger sentence in `sai/policies/artifact-feedback-gate.md` (~line 47). Change `exhausts its one-round cap` to three-round language. Leave ownership, labels, iteration counter, and interruption branch untouched.

Replace that sentence with:

```markdown
Defer the ordinary user-facing gate while another review round is required. Present that gate for the first time, unchanged at iteration 0, only after the review rounds converge, exhaust the three-round cap, or are interrupted by worker failure. Its first ordered labels remain `Give feedback (Recommended)` followed by `proceed-label` (for sai-1, `Finish step`).
```

- [ ] Confirm `rg -n "exhausts its one-round cap" sai/policies/artifact-feedback-gate.md` returns no matches.
- [ ] Confirm severity criteria headings and `Summary:` tally form still present unchanged in `artifact-review-contract.md`.

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `rg -n "one-round cap|exhausts its one-round" sai/policies/artifact-feedback-gate.md` — no matches
- [ ] `rg -n "conditional|--supervised|automatic worker-owned" sai/policies/artifact-review-contract.md` — enumeration conditional
- [ ] `rg -n "High|Medium|Low|five fields|Summary:" sai/policies/artifact-review-contract.md` — normative body intact

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 6: Sync seven main capability specs to the delta

*(Service-side / non-UI step — main-spec merge from delta. No RED/GREEN.)*

For each capability below, merge ADDED/MODIFIED/RENAMED content from
`openspec/changes/suppress-worker-review-under-supervision/specs/<capability>/spec.md`
into `openspec/specs/<capability>/spec.md`. Prefer structured merge over free rewrite. Do not modify `review-finding-format` or other out-of-scope capabilities.

- [ ] **`planning-artifact-review-loop`**: Insert ADDED requirements `supervised-marker-suppresses-automatic-loop` and `supervised-flag-prefix-grammar` near the top of Requirements. Replace MODIFIED bodies for `worker-owned-review-pass`, `automatic-loop-caps`, `user-requested-additional-passes`, `the-shared-contract-enumerates-this-surface`, and `coexistence-with-existing-review-surfaces` with the delta text (supervision-conditional automatic loop; caps only on non-suppressed path; coexistence no longer accepts duplication under supervision).

- [ ] **`supervised-pipeline-forwarding`**: Add `Forward supervised marker on Auto dispatches` from delta. Modify `Preserve chained forwarding` so language-bearing chained design carries `--fast-track`, `--supervised`, and `--overview-lang` together.

- [ ] **`supervised-review-rounds`**: RENAMED — replace requirement title `one-round-cap-per-phase` with `three-round-cap-per-phase` and body/scenarios from delta (three rounds per phase per Auto attempt; counter reset; sole automatic convergence under supervision). Update related MODIFIED requirements (`round-closes-the-bound`, `cap-exhaustion-applies-last-round-findings`, `worker-failure-ends-cycle`, `manual-loop-counts-are-separate`) to three-round wording. Ensure no current requirement title remains `one-round-cap-per-phase`.

- [ ] **`explore-pipeline-supervision`**: Apply MODIFIED requirements from delta (marker on lifecycle/retry; three-round bounds; no automatic worker-owned reviewer under supervision; Manual injects nothing).

- [ ] **`pipeline-design-phase-chaining`**: Apply MODIFIED design-loop and deferred-gate requirements to three-round extend-while-cap-permits and deferred gate after three-round exhaustion.

- [ ] **`supervised-review-reporting`**: Update `cap-exhaustion-one-line-report` so the trigger is three-round exhaustion (report shape unchanged).

- [ ] **`artifact-feedback-gate`**: Update machine-feedback deferred-gate trigger to three-round exhaustion; leave ownership/labels/counter/interruption unchanged.

##### Step 6 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `rg -n "supervised-marker-suppresses-automatic-loop|supervised-flag-prefix-grammar" openspec/specs/planning-artifact-review-loop/spec.md` — both present
- [ ] `rg -n "Forward supervised marker on Auto dispatches" openspec/specs/supervised-pipeline-forwarding/spec.md` — present
- [ ] `rg -n "three-round-cap-per-phase" openspec/specs/supervised-review-rounds/spec.md` — present
- [ ] `rg -n "one-round-cap-per-phase" openspec/specs/supervised-review-rounds/spec.md` — **no** current requirement title (historical mentions in Purpose only if any must not remain as live title)
- [ ] `rg -n "--supervised|three-round" openspec/specs/explore-pipeline-supervision/spec.md` — marker/three-round lifecycle wording
- [ ] `rg -n "three-round" openspec/specs/pipeline-design-phase-chaining/spec.md openspec/specs/supervised-review-reporting/spec.md openspec/specs/artifact-feedback-gate/spec.md` — present
- [ ] Confirm `openspec/specs/review-finding-format/spec.md` untouched (`git diff -- openspec/specs/review-finding-format/spec.md` empty)

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 6 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 7: Close remaining contract-test pins and residual wording grep

*(Testable step — RED updates assertions; GREEN is production already landed in Steps 1–6 plus any remaining assertion rewrites that make the scoped suite pass.)*

##### RED phase

- [ ] Update / add assertions in the scoped suites. Prefer extending existing tests over large rewrites. Pin groups:

**1. Spec grammar / precedence / empty-request / in-body token / reference-set** — add to `test/spec-coordinator-worker.test.js`:

```javascript
test('supervised flag strip follows wrapper-echo precedence and excludes marker from reference set', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);

  assert.match(worker, /wrapper echo before arguments|wrapper_echo_value[\s\S]{0,80}arguments_value/i,
    'envelope source uses existing wrapper-echo precedence before flag strip');
  assert.match(worker, /trimmed content equals exactly[\s\S]{0,40}--supervised|exactly the bare string `--supervised`/i,
    'leading flag strip is exact bare --supervised lines');
  assert.match(worker, /empty or whitespace-only[\s\S]{0,80}fail|fail[\s\S]{0,80}empty request/i,
    'empty request after flag strip fails validation');
  assert.match(worker, /later line or substring `--supervised`[\s\S]{0,80}request content|not a flag/i,
    'in-body --supervised is not consumed as a flag');
  assert.match(worker, /flag-stripped request|reviewers never receive the `--supervised` line/i,
    'reference set excludes the marker line');
  assert.match(worker, /supervised[\s\S]{0,200}do \*\*not\*\* dispatch any automatic isolated reviewer|When invocation-scoped `supervised` is true[\s\S]{0,200}do \*\*not\*\* dispatch/i,
    'marker present suppresses automatic reviewer dispatch');
  assert.match(worker, /user-requested pass[\s\S]{0,200}neither automatic-loop cap|marker does not block/i,
    'user-requested pass still available under suppression');
});
```

**2. Design name-first flag order** — add to `test/spec-coordinator-worker.test.js` or a design suite file if one already pins design worker flags; otherwise add to `test/explore-pipeline-selector.test.js` reading `sai/commands/design/worker.md`:

```javascript
test('design worker recognizes --supervised name-first in either flag order', () => {
  const worker = spec('sai/commands/design/worker.md');

  assert.match(worker, /bare flag `--supervised`|--supervised` \(no value\)/i);
  assert.match(worker, /order-independent among flags after the change name/i);
  assert.match(worker, /`--fast-track --supervised`|`--supervised --fast-track`/i);
  assert.match(worker, /When invocation-scoped `supervised` is true[\s\S]{0,200}do \*\*not\*\* dispatch/i);
});
```

**3. Coexistence / no accepted duplication under supervision** — rewrite the outdated tests in `test/explore-pipeline-selector.test.js`:

- Replace test `'Step 2: worker review stays active under supervision without a routed task list'` so it asserts:
  - worker has supervised automatic-loop suppression gate
  - supervised flow still has no adapter-declared plan / no plan-based list / step marking has no application
  - under supervision automatic worker-owned loop does **not** run in addition to in-session rounds (no "coexists … never replaces" as acceptance of dual automatic layers under supervision)

- Replace test `'Step 3: supervised design keeps the worker-owned review and the supervised review rounds both active without routed-list marking'` similarly: suppression under marker + no routed-list marking; dual-automatic-layer wording removed.

**4. Suppression counters + no automatic review event** — pin worker text that both counters stay 0 and no automatic-path `review` event under suppression (spec + design workers).

**5. Three-round per-attempt + counter reset** — strengthen explore suite matches for three-round cap, High extends while cap permits, third-round High = cap exhaustion, reset to 0 on new Auto attempt. Remove any remaining pins that require `at most one review round` as the live supervised bound in production instruction text (keep glossary-safe three-round matches).

**6. Non-supervised automatic loop still required** — keep/add pins that marker-absent path still runs automatic review before `completed` (existing Step 2 High=0 tests stay green).

**7. `todo-structure-policy.test.js`** — update surface enumeration pin to require conditional automatic worker-owned loop / `--supervised` absence; keep five-field finding shape and `Summary:` tally pins.

- [ ] Inspect `test/design-coordinator-worker.test.js` for unconditional automatic-review-under-supervision pins. **Default:** no hit — leave unmodified. If a hit exists, update in this same step and add `M test/design-coordinator-worker.test.js` to Files Affected / recompute `design.md` File Manifest.

- [ ] Verify RED: run targeted failing assertions if any production gap remains; otherwise proceed to GREEN suite green path.

##### GREEN phase (only after RED structure is in place)

- [ ] Ensure all production files from Steps 1–6 already satisfy the new pins. If any pin still fails, fix the **production** surface (not the test) unless the pin itself is wrong.
- [ ] Closed residual grep — run from repo root and close every **live** supervised one-round pin in production paths (ignore archive/history and unrelated "at most one replacement" phrases):

```powershell
rg -n "one-round|at most one review round|heavy convergence" sai/commands/explore/instructions.md sai/commands/spec/worker.md sai/commands/design/worker.md sai/policies/artifact-feedback-gate.md sai/policies/artifact-review-contract.md openspec/specs/planning-artifact-review-loop openspec/specs/supervised-pipeline-forwarding openspec/specs/supervised-review-rounds openspec/specs/explore-pipeline-supervision openspec/specs/pipeline-design-phase-chaining openspec/specs/supervised-review-reporting openspec/specs/artifact-feedback-gate test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/todo-structure-policy.test.js test/design-coordinator-worker.test.js
```

- [ ] Verify GREEN: run

```powershell
node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/todo-structure-policy.test.js
```

Expected: exit 0.

##### Step 7 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED pin groups 1–7 present as concrete assertions
- [ ] GREEN scoped suite exits 0
- [ ] Residual grep of closed phrase set shows no live one-round supervised-cap pins in production paths listed above
- [ ] Non-supervised automatic-loop pins remain green
- [ ] `design-coordinator-worker.test.js` either unmodified (verified no-hit) or updated with File Manifest recompute

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 7 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

## Manual Verification (post-apply)

- **End-to-end smoke (supervised):** Run explore Auto on a throwaway change and confirm (1) sai-1 `arguments_value` begins with `--supervised` and the Ready-to-Propose body, (2) chained design `arguments_value` is `{name} --fast-track --supervised` (plus overview-lang when selected), (3) neither worker dispatches an automatic isolated reviewer, (4) in-session rounds may run up to three times per phase on sustained High findings, (5) `review` stays unmarked on both workers' automatic paths.
- **End-to-end smoke (standalone):** Invoke `/sai-1-spec` and `/sai-2-design` without the marker and confirm the automatic worker-owned review loop still runs and can mark `review` on High=0.
- **Generated-artifact drift:** After edits, re-run the scoped contract tests and confirm no stale one-round / heavy-convergence / unconditional-worker-review pins remain in the closed grep set.

## Decision records created this planning run

- `docs/adr/0147-supervision-marker-as-flag-content-in-two-string-envelope.md` (D1)
- `docs/adr/0148-two-phase-grammars-one-supervision-marker.md` (D2)
- `docs/adr/0149-suppress-only-automatic-worker-owned-review-loop.md` (D3)
- `docs/ddr/0150-three-round-supervised-cap-per-phase-per-auto-attempt.md` (D4)
- Warm-spliced into `docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md`

D5 and D6 did not meet all three ADR/DDR criteria (not hard to reverse as pipeline architecture); no records created.
