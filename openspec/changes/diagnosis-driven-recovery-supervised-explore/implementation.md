# diagnosis-driven-recovery-supervised-explore

## Goal

Give Explore Auto item 10 one bounded, read-only Review Engine Diagnosis Round and at most one same-worker `continue_after_recovery` re-dispatch after a supervised phase-worker `failed` or (under a named Bounded Recovery exception) `cancelled` result — with conversation-only `diagnosis_rounds`, idea-list render rules that never masquerade as review progress, glossary test lock for **Diagnosis Round**, and co-located structural tests — without Explore writes, replacement workers, Build edits, harness idea-list binding edits, or durable recovery metadata.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "diagnosis-driven-recovery-supervised-explore"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Name the Explore Auto cancellation exception in Bounded Recovery

*(Testable step — RED → GREEN. Co-locate Bounded Recovery prose with `test/bounded-worker-recovery.test.js` pins per design D1/D6. ADRs 0167–0169 already exist from planning; do not recreate them.)*

**Expertise:** Markdown instruction contracts + Node.js `node:test` structural assertions. Prefer widening matchers when wording expands; do not rewrite production text to match stale absolute phrases. Do not edit baseline `openspec/specs/**`. Do not edit `sai/commands/build/coordinator.md`.

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full production prose here.

- [x] Append the following new test cases to `test/bounded-worker-recovery.test.js` (after the existing `recovery preserves ordinary continuation fallback and invocation accounting` test is fine). Keep existing tests intact. The existing pin `cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery` MUST remain green after GREEN — ordinary cancellation clean-stop is preserved.

```js
test('ordinary cancellation remains a clean stop outside Explore Auto item 10', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(
    runner,
    /cancelled[\s\S]{0,220}(?:never|no)[\s\S]{0,160}(?:enter|re-enter|recovery)/i,
    'ordinary cancelled results must still never enter generic recovery'
  );
  assert.match(
    runner,
    /(?:standalone|Build|manual|outer)[\s\S]{0,260}cancelled[\s\S]{0,260}(?:clean|zero|no diagnosis|no recovery)|cancelled[\s\S]{0,260}(?:standalone|Build|manual|outer)[\s\S]{0,260}(?:clean|zero|no diagnosis|no recovery)/i,
    'non-Explore cancellation boundaries must remain clean stops'
  );
  assert.match(
    runner,
    /(?:zero|no)[\s\S]{0,80}(?:bounded[- ]recovery|three[- ]slot|ledger)[\s\S]{0,120}(?:cancel|Explore)|(?:cancel|Explore)[\s\S]{0,200}(?:never|not|no)[\s\S]{0,120}(?:three[- ]slot|ledger spend|ledger slot)/i,
    'Explore exception must not spend the shared three-slot ledger'
  );
});

test('Explore Auto item-10 cancellation is a named one-shot diagnosable exception', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(
    runner,
    /Explore Auto[\s\S]{0,120}item[- ]?10|item[- ]?10[\s\S]{0,120}Explore Auto/i,
    'exception must name selector-dispatched Explore Auto item 10'
  );
  assert.match(
    runner,
    /cancelled[\s\S]{0,300}(?:Diagnosis Round|diagnos)|(?:Diagnosis Round|diagnos)[\s\S]{0,300}cancelled/i,
    'Explore Auto cancelled may enter the named Diagnosis Round'
  );
  assert.match(
    runner,
    /diagnosis_rounds/i,
    'exception must reference phase-keyed diagnosis_rounds'
  );
  assert.match(
    runner,
    /(?:at most one|exactly one|one-shot|one )[\s\S]{0,120}(?:same[- ]worker|re-dispatch)|same[- ]worker[\s\S]{0,120}(?:at most one|exactly one|one)/i,
    'exception permits at most one same-worker re-dispatch'
  );
  assert.match(
    runner,
    /(?:never|no|not)[\s\S]{0,120}replacement[\s\S]{0,160}(?:worker|dispatch)|replacement[\s\S]{0,120}(?:never|no|not)[\s\S]{0,160}(?:Explore|exception|diagnosis)/i,
    'Explore exception never dispatches a replacement worker'
  );
});

test('Explore continuation loss after diagnosis is terminal without replacement', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(
    runner,
    /continuation\/transport loss/i,
    'shared continuation/transport loss stopping diagnosis must remain named'
  );
  assert.match(
    runner,
    /(?:Explore|item[- ]?10|Diagnosis Round)[\s\S]{0,400}continuation\/transport loss[\s\S]{0,300}(?:never|no|not)[\s\S]{0,160}replacement|(?:continuation\/transport loss)[\s\S]{0,400}(?:Explore|item[- ]?10)[\s\S]{0,300}(?:never|no|not)[\s\S]{0,160}replacement/i,
    'undeliverable same-worker continuation after Explore diagnosis must not fall through to replacement'
  );
  assert.match(
    runner,
    /(?:retryable|later Auto|new Auto)[\s\S]{0,200}(?:attempt|selection)|(?:leave|left|remain)[\s\S]{0,120}(?:retryable|uncompleted)/i,
    'terminal Explore diagnosis stop leaves the change retryable'
  );
});
```

- [x] Verify RED: run `node --test test/bounded-worker-recovery.test.js` — expected: **assertion failure** on the new Explore-exception pins (exit ≠ 0). Existing cases should still pass.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [x] Edit `sai/orchestration/command-runner.md` **Bounded Recovery** section. Apply a narrowly scoped exception without restating the full failed/disproved-completed/STOP trigger set, five-section hand-back, or three-slot ledger accounting inside Explore.

**Required edits (normative concepts; wording may vary; tests pin concepts):**

1. **Preserve ordinary cancellation clean-stop.** Keep language that `cancelled` never enters or re-enters **generic** recovery / closes without a recovery charge for ordinary adapters. Preferred approach: qualify item 7 / item 9 so the default remains "cancelled never enters generic recovery" and the Explore exception is an explicit sole carve-out.

2. **Add a named Explore Auto item-10 cancellation exception** (new short paragraph under item 9, or a dedicated bullet immediately after the ordinary cancellation sentence). Required content:
   - Predicate: selector-dispatched **Explore Auto item 10** ∧ post-resolution supervised phase-worker `status: cancelled` ∧ phase conversation-only `diagnosis_rounds.<phase>` is unused (`0`).
   - Effect: MAY enter the Explore **Diagnosis Round** defined by Explore item 10 (reference Explore; do not duplicate Review Engine steps here).
   - Bound: at most one read-only diagnosis and at most one **same-worker** re-dispatch for the active phase.
   - Never a **replacement worker**.
   - Never spends a shared **three-slot ledger** slot (uses only `diagnosis_rounds.spec` / `diagnosis_rounds.design`).
   - Does **not** make cancellation recoverable for standalone spec/design adapters, Build, the manual item-9 review loop, adapters without the named Explore route, or an outer user cancellation.

3. **Continuation/transport loss on the Explore exception path.** When an Explore Diagnosis Round establishes an actionable correction but same-worker continuation cannot be delivered or the worker cannot be resumed: record `continuation/transport loss` as the stopping diagnosis, consume the already-run diagnosis round, do **not** dispatch ordinary replacement-worker fallback, leave the change retryable for a later Auto selection.

4. **Fast-track invariant.** Extend the existing `--fast-track` sentence (item 10) so it also does not widen the Explore exception's one diagnosis-round / one same-worker bound (ordinary cancellation remains outside generic recovery).

5. **Do not** restate `Reported`/`Evidence`/`Cause`/`Correction`/`Verification` as a second generic contract inside this exception paragraph — the existing item 9 hand-back sentence remains the single source for those labels.

Cross-link ADR 0167 only if a Related-style note already exists in the runner; do not invent an ADR section inside the runner.

- [x] If the existing pin `cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery` fails solely because the exception sentence sits too close and confuses the window, **widen that matcher** (not GREEN prose) to require ordinary/generic cancellation language (e.g. still match `never enters or re-enters recovery` / `closes as cancelled without a recovery charge` for the default path). Do not delete the ordinary clean-cancel pin.

- [x] Verify GREEN: run `node --test test/bounded-worker-recovery.test.js` — expected: **PASS** (exit 0).

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/bounded-worker-recovery.test.js` fails as expected on new Explore-exception pins
- [x] GREEN verified — `node --test test/bounded-worker-recovery.test.js` passes
- [x] Ordinary cancellation clean-stop pin still green
- [x] No baseline file under `openspec/specs/**` was modified
- [x] `sai/commands/build/coordinator.md` was not modified

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Extend Explore item 10 with one-shot diagnosis and same-worker re-dispatch

*(Testable step — RED → GREEN. Co-locate item-10 prose with `test/explore-pipeline-selector.test.js` pins per design D2/D6.)*

**Expertise:** Explore instruction contracts. Reference Bounded Recovery by path/section; do not duplicate the full shared recovery contract. Preserve clean `completed` / `needs_input` / progress / notice and pre-resolution behavior. Prefer explicit file invocation on Windows/opencode: `node --test test/explore-pipeline-selector.test.js`.

##### RED phase

- [x] Append the following new tests to `test/explore-pipeline-selector.test.js` (end of file is fine). Reuse existing helpers (`exploreContract`, `supervisionContract`, `spec`, `artifact`) already defined in the file.

```js
test('item-10 failed worker starts one phase-selected Review Engine diagnosis round', () => {
  const source = exploreContract();

  assert.match(
    source,
    /diagnosis_rounds/i,
    'item 10 must maintain conversation-only diagnosis_rounds'
  );
  assert.match(
    source,
    /(?:failed|cancelled)[\s\S]{0,500}Review Engine\([\s\S]{0,80}sai-1|Review Engine\([\s\S]{0,80}sai-1[\s\S]{0,500}(?:failed|cancelled)/i,
    'failed/cancelled supervised worker must invoke phase-selected Review Engine'
  );
  assert.match(
    source,
    /Reported[\s\S]{0,80}Evidence[\s\S]{0,80}Cause[\s\S]{0,80}Correction[\s\S]{0,80}Verification/i,
    'diagnosis feedback must use the ordered five-section hand-back labels'
  );
  assert.match(
    source,
    /continue_after_recovery/i,
    'actionable diagnosis re-dispatches via continue_after_recovery'
  );
  assert.match(
    source,
    /(?:at most one|exactly one|one)[\s\S]{0,120}(?:same[- ]worker|re-dispatch)|same[- ]worker[\s\S]{0,160}(?:at most one|exactly one|one)/i,
    're-dispatch is single and same-worker'
  );
});

test('item-10 cancelled worker uses the Explore-specific diagnosis path', () => {
  const source = exploreContract();

  assert.match(
    source,
    /cancelled[\s\S]{0,400}(?:Diagnosis Round|diagnosis_rounds|Review Engine)|(?:Diagnosis Round|diagnosis_rounds)[\s\S]{0,400}cancelled/i,
    'cancelled supervised worker on item 10 enters diagnosis when counter unused'
  );
  assert.match(
    source,
    /(?:does not|never|not)[\s\S]{0,200}(?:make|render|treat)[\s\S]{0,160}cancellation[\s\S]{0,200}(?:recoverable|standalone|manual)|cancellation[\s\S]{0,200}(?:item[- ]?10[- ]specific|Explore[- ]specific)/i,
    'cancellation diagnosis remains item-10-specific'
  );
});

test('item-10 diagnosis findings are forwarded without direct Explore repair', () => {
  const source = exploreContract();

  assert.match(
    source,
    /(?:never|does not|must not|shall not)[\s\S]{0,160}(?:apply|write|edit|repair)[\s\S]{0,200}(?:correction|artifact)|(?:no|never)[\s\S]{0,80}direct[\s\S]{0,80}(?:write|repair)/i,
    'Explore never applies corrections or writes artifacts on the diagnosis route'
  );
  assert.match(
    source,
    /(?:never|no|not)[\s\S]{0,120}replacement[\s\S]{0,160}worker|replacement worker[\s\S]{0,160}(?:never|no|not)/i,
    'diagnosis route never dispatches a replacement worker'
  );
});

test('item-10 diagnosis counter is independent of review_rounds', () => {
  const source = exploreContract();

  assert.match(
    source,
    /diagnosis_rounds\.(?:spec|design)|diagnosis_rounds\s*=\s*\{[\s\S]{0,80}spec[\s\S]{0,80}design/i,
    'phase-keyed diagnosis_rounds.spec / diagnosis_rounds.design must be named'
  );
  assert.match(
    source,
    /(?:independent|separate|does not|never)[\s\S]{0,160}review_rounds|review_rounds[\s\S]{0,160}(?:independent|separate|not[\s\S]{0,40}increment)/i,
    'diagnosis must not mutate review_rounds'
  );
  assert.match(
    source,
    /(?:reset)[\s\S]{0,120}(?:new Auto|Auto attempt)|(?:new Auto|Auto attempt)[\s\S]{0,120}reset/i,
    'diagnosis counters reset on a new Auto attempt'
  );
});

test('item-10 diagnosis references Bounded Recovery without a second generic contract', () => {
  const source = exploreContract();

  assert.match(
    source,
    /command-runner\.md[\s\S]{0,120}Bounded Recovery|Bounded Recovery[\s\S]{0,120}command-runner\.md/i,
    'item 10 must reference shared Bounded Recovery as single source'
  );
  assert.doesNotMatch(
    source,
    /three-slot ledger[\s\S]{0,200}Explore Auto item 10[\s\S]{0,200}three routing diagnoses/,
    'Explore must not restate the full generic recovery ledger contract'
  );
});

test('item-10 exhausted or failed diagnosis leaves change retryable with phase guidance only', () => {
  const source = exploreContract();

  assert.match(
    source,
    /continuation\/transport loss/i,
    'undeliverable continuation uses shared continuation/transport loss'
  );
  assert.match(
    source,
    /(?:retryable|later[\s\S]{0,40}Auto|uncompleted)[\s\S]{0,200}(?:Auto|selection|attempt)/i,
    'after bounded route ends the change stays Auto-retryable'
  );
  assert.match(
    source,
    /Next step: run \/sai-1-spec|Next step: run \/sai-2-design/,
    'existing phase guidance lines remain the terminal hand-off'
  );
  assert.doesNotMatch(
    source,
    /sai-3-implement[\s\S]{0,80}diagnosis|diagnosis[\s\S]{0,80}sai-3-implement/,
    'diagnosis route must not dispatch implementation'
  );
});
```

- [x] Verify RED: run `node --test test/explore-pipeline-selector.test.js` — expected: **assertion failure** on the new item-10 diagnosis pins. If an existing test asserts immediate-stop-only failed/cancelled behavior (e.g. wording that forbids any diagnosis after fail/cancel), **rewrite that conflicting assertion in RED** so it pins the new bounded route instead — the suite must be green after GREEN of this step.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [x] Edit `sai/commands/explore/instructions.md` item 10. Replace the **immediate** failed/cancelled stop (currently around the paragraphs that say report outcome, clear `active_change`, keep retryable, perform no repair — and the parallel in-session round interruption paragraphs that stop without diagnosis) with the bounded diagnosis route below. Preserve:
  - Existing phase-guidance lines (`Next step: run /sai-1-spec…` / `/sai-2-design…`)
  - Autonomy audit at failed/cancelled endings
  - Clean completed / needs_input / progress / notice / pre-resolution behavior
  - Ordinary three-round supervised review budgets (`review_rounds`)
  - Manual item-9 Review Engine contract unchanged
  - No Explore direct writes; no replacement worker from diagnosis
  - No `sai-3-implement` dispatch

**Required normative content for the diagnosis route (place as a dedicated subsection under item 10, e.g. `**Item-10 Diagnosis Round (failed/cancelled supervised worker)**`, and call it from both the general failed/cancelled outcome path and the in-session round interruption paths):**

1. **State:** Maintain conversation-only `diagnosis_rounds = { spec: 0, design: 0 }` in supervision state. Each counter is `0|1` per Auto attempt, increments once when that phase's Diagnosis Round runs, never exceeds `1`, resets to `0` on a new Auto attempt, and is **never** written to worker payloads, journals, artifacts, configuration, or `.openspec.yaml`. Independent of `review_rounds`.

2. **Activation:** When a resolved supervised spec or design worker returns `failed` (any closed worker failure class) or `cancelled`, and the active phase's diagnosis counter is unused:
   - First resolve idea-list pending (Step 3 owns render detail — reference the review-in-progress / idea-list rules; do not expand full render contract here beyond "resolve active phase review item to `pending` before diagnosis").
   - Increment `diagnosis_rounds.spec` or `diagnosis_rounds.design` once for the active phase.
   - Invoke existing Review Engine exactly once: `Review Engine(changeName, "sai-1")` for spec phase or `Review Engine(changeName, "sai-2")` for design phase — fresh read-only disk reread; Explore remains read-only.
   - Form diagnosis feedback in exact order: `Reported`, `Evidence`, `Cause`, `Correction`, `Verification`. Preserve severity-rated findings and base-form summary when available; describe missing/unavailable evidence when the engine cannot form findings. Reference `sai/orchestration/command-runner.md` **Bounded Recovery** for shared non-clean trigger semantics and the five-section hand-back — do not restate the three-slot ledger or three routing diagnoses as a second generic contract.
   - If an actionable correction exists and the same worker can be resumed: re-dispatch **exactly once** via `continue_after_recovery` carrying that diagnosis feedback. Explore never applies the correction directly and never dispatches a replacement worker.
   - If no actionable correction, worker veto, failed re-dispatch, or undeliverable continuation: close the active attempt without another diagnosis. For undeliverable same-worker continuation after an actionable diagnosis, select shared `continuation/transport loss`, consume the diagnosis round, and do **not** fall through to ordinary replacement-worker fallback. Leave the change uncompleted and Auto-retryable; emit existing phase guidance only.

3. **After successful re-dispatch:** return to the ordinary phase lifecycle (including ordinary supervised review entry). A later failed/cancelled result from that re-dispatch does **not** start a second diagnosis in the same phase attempt.

4. **Non-activation:** Clean `completed`, `needs_input`, progress, notice, and pre-resolution results do **not** start an item-10 Diagnosis Round.

5. **Build boundary:** Do not modify `sai/commands/build/coordinator.md`; Build receives no Explore diagnosis counter or delegated-write exception from this route.

- [x] Verify GREEN: run `node --test test/explore-pipeline-selector.test.js` — expected: **PASS**.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — new item-10 diagnosis pins fail before GREEN
- [x] GREEN verified — `node --test test/explore-pipeline-selector.test.js` passes
- [x] Existing selector / supervised-round / phase-guidance pins remain green
- [x] `sai/commands/build/coordinator.md` unchanged
- [x] No harness idea-list binding files edited

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Idea-list diagnosis render rules in Explore instructions

*(Testable step — RED → GREEN. Instruction-only; `test/explore-pipeline-selector.test.js` is the designated idea-list suite home — extend-don't-create. Design D4.)*

##### RED phase

- [ ] Append the following tests to `test/explore-pipeline-selector.test.js`:

```js
test('item-10 diagnosis resolves active review item to pending before diagnosis', () => {
  const source = exploreContract();

  assert.match(
    source,
    /(?:failed|cancelled)[\s\S]{0,400}pending[\s\S]{0,200}(?:Diagnosis Round|diagnosis)|(?:Diagnosis Round|diagnosis)[\s\S]{0,200}(?:before|prior)[\s\S]{0,120}|(?:resolv\w*)[\s\S]{0,120}pending[\s\S]{0,200}(?:Diagnosis Round|diagnosis)/i,
    'active phase review item must resolve to pending before Diagnosis Round'
  );
});

test('item-10 diagnosis does not set review items in_progress or add a diagnosis list item', () => {
  const source = exploreContract();

  assert.match(
    source,
    /Diagnosis Round[\s\S]{0,500}(?:neither|not|never)[\s\S]{0,200}in_progress|during[\s\S]{0,80}diagnosis[\s\S]{0,300}(?:neither|not|never)[\s\S]{0,200}in_progress/i,
    'diagnosis must not set reviewed-sai-1/2 in_progress'
  );
  assert.match(
    source,
    /(?:no|never|not)[\s\S]{0,120}(?:diagnosis[- ]specific|diagnosis)[\s\S]{0,80}(?:item|row|entry)|(?:no|never)[\s\S]{0,80}new[\s\S]{0,80}list item/i,
    'no diagnosis list item is added'
  );
});

test('item-10 diagnosis findings do not mark or clear review evidence', () => {
  const source = exploreContract();

  assert.match(
    source,
    /diagnosis[\s\S]{0,300}(?:mark|clear)[\s\S]{0,200}(?:no|not|never|unchanged)|(?:mark or clear no|do not mark|never mark)[\s\S]{0,200}(?:evidence|review)/i,
    'diagnosis findings must not mark or clear evidence'
  );
  assert.match(
    source,
    /(?:not|never)[\s\S]{0,160}(?:counted|count)[\s\S]{0,160}(?:Supervised Review Round|review round)|recovery feedback[\s\S]{0,160}(?:not|never)[\s\S]{0,120}review/i,
    'diagnosis is recovery feedback, not a supervised review round'
  );
});

test('item-10 successful re-dispatch resumes ordinary review in_progress only at review entry', () => {
  const source = exploreContract();

  assert.match(
    source,
    /(?:successful|succeeds)[\s\S]{0,300}(?:re-dispatch|redispatch)[\s\S]{0,400}in_progress|(?:ordinary|existing)[\s\S]{0,120}review[\s\S]{0,200}in_progress[\s\S]{0,200}(?:re-dispatch|diagnosis)/i,
    'only ordinary review entry after successful re-dispatch may set in_progress again'
  );
});

test('item-10 stopped diagnosis leaves phase item pending without persistence', () => {
  const source = exploreContract();

  assert.match(
    source,
    /(?:stopped|stop)[\s\S]{0,200}diagnosis[\s\S]{0,200}pending|diagnosis[\s\S]{0,200}(?:stops|stop)[\s\S]{0,200}pending/i,
    'stopped diagnosis leaves phase item pending'
  );
  assert.match(
    source,
    /(?:never|no|not)[\s\S]{0,160}(?:persist|written|write)[\s\S]{0,200}(?:diagnosis_rounds|diagnosis finding|\.openspec\.yaml)|diagnosis[\s\S]{0,200}(?:conversation[- ]only|not[\s\S]{0,80}persisted)/i,
    'diagnosis state is not persisted to files or .openspec.yaml'
  );
});

test('item-10 diagnosis render rules live in explore instructions only', () => {
  const source = exploreContract();
  const claudeBinding = fs.readFileSync(
    path.join(repoRoot, 'sai/adapters/claude/idea-list-render.md'),
    'utf8'
  );
  const opencodeBinding = fs.readFileSync(
    path.join(repoRoot, 'sai/adapters/opencode/idea-list-render.md'),
    'utf8'
  );

  assert.match(source, /Diagnosis Round/i);
  assert.doesNotMatch(
    claudeBinding,
    /Diagnosis Round|diagnosis_rounds/i,
    'Claude idea-list binding must not restate diagnosis contract'
  );
  assert.doesNotMatch(
    opencodeBinding,
    /Diagnosis Round|diagnosis_rounds/i,
    'opencode idea-list binding must not restate diagnosis contract'
  );
});
```

- [ ] Verify RED: `node --test test/explore-pipeline-selector.test.js` — expected: assertion failure on new idea-list diagnosis pins.

- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] Edit only `sai/commands/explore/instructions.md` idea-list / review-in-progress rules (item 11 **Review-in-progress state** and any cross-reference from the item-10 Diagnosis Round subsection). **Do not** edit `sai/adapters/claude/idea-list-render.md` or `sai/adapters/opencode/idea-list-render.md`.

**Required normative content:**

1. Before an item-10 **Diagnosis Round** begins after a failed or cancelled worker, any active phase review item (`reviewed-sai-1` or `reviewed-sai-2`) that is `in_progress` **resolves to `pending`** and the list renders that state change once.
2. While the Diagnosis Round and its possible same-worker re-dispatch are active: neither `reviewed-sai-1` nor `reviewed-sai-2` is set `in_progress` because of diagnosis; no diagnosis-specific list item is created; diagnosis findings mark or clear **no** review evidence; `diagnosis_rounds` does not affect review-round list state.
3. If the re-dispatch succeeds and the phase reaches the existing ordinary supervised review entry point, the phase's normal review item becomes `in_progress` under the existing phase rules — not from the diagnosis itself.
4. If diagnosis stops, the re-dispatch fails, or the worker fails/cancels again, the phase item remains or resolves to `pending`; no mark/clear from the diagnosis route.
5. Diagnosis counters, findings, and render state are never written to any file, artifact, change directory, configuration, or `.openspec.yaml`.
6. Panel ownership, machine-readable identities, and no-persistence rules remain unchanged.

- [ ] Verify GREEN: `node --test test/explore-pipeline-selector.test.js` — expected: PASS.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — idea-list diagnosis pins fail before GREEN
- [ ] GREEN verified — `node --test test/explore-pipeline-selector.test.js` passes
- [ ] `sai/adapters/claude/idea-list-render.md` and `sai/adapters/opencode/idea-list-render.md` unchanged
- [ ] No dedicated `explore-idea-list` test file was created

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Lock Diagnosis Round glossary coverage (test-only)

*(Testable step — RED → GREEN. Test-only; no `GLOSSARY.md` write. Design D5.)*

##### RED phase

- [ ] Edit `test/glossary-diagnosis-terms.test.js` only. Add `'Diagnosis Round'` to the `DIAGNOSIS_TERMS` array (keep existing terms). Optionally add a focused relationship pin:

```js
const DIAGNOSIS_TERMS = [
  'Routing Diagnosis',
  'Diagnosis Key',
  'Duplicate Diagnosis',
  'Unresolved Cause',
  'Continuation/Transport Loss',
  'Known-False Report Recovery',
  'Diagnosis Round'
];

// existing tests unchanged...

test('Diagnosis Round is recovery feedback and not a Supervised Review Round', () => {
  const definition = definitionFor('Diagnosis Round');

  assert.match(
    definition,
    /Review Engine/i,
    'Diagnosis Round should name the Review Engine'
  );
  assert.match(
    definition,
    /(?:recovery feedback|correction feedback|not counted as a[\s\S]{0,40}Supervised Review Round)/i,
    'Diagnosis Round findings are recovery feedback, not a Supervised Review Round'
  );
  assert.doesNotMatch(
    definition,
    /\breview_rounds\b/,
    'Diagnosis Round must not alias review_rounds counters'
  );
});
```

- [ ] Verify RED: run `node --test test/glossary-diagnosis-terms.test.js` — if `GLOSSARY.md` already defines **Diagnosis Round** (it does), the required-term loop may already pass once the term is added; the focused relationship test should still pass against the existing definition. If the term were missing, the loop would fail — that is the intended lock. Expected: **PASS** against current glossary once the term is required, or fail only if definition drifts. If the suite is already green after adding the term (definition present), treat RED as: temporarily rename the expected term in the test to prove failure, then restore — OR accept that this step's RED is "add required-term pin that would fail if glossary lost the definition" and document that the live glossary already satisfies it. Preferred: run the test after adding the term; if green immediately because the definition exists, that is acceptable for a lock-only step — still run the suite and treat GREEN as "no glossary edit; tests require the term."

  **Practical RED for lock-only:** After adding the term to the array, briefly assert a wrong substring in a throwaway local check is unnecessary — instead verify that removing the glossary definition would fail. Operational procedure for apply: (1) add term + relationship test, (2) run suite — expected PASS with existing glossary (definition already correct). If PASS without any glossary edit, mark RED gate as satisfied by the lock's negative property (suite fails when definition absent — spot-check by temporarily commenting the glossary line is optional and not required if risky). Proceed to GREEN with **no `GLOSSARY.md` write**.

- [ ] **GATE — Do not edit `GLOSSARY.md`.**

##### GREEN phase

- [ ] Confirm `GLOSSARY.md` already defines **Diagnosis Round** consistently (read-only). **Do not modify `GLOSSARY.md`.**
- [ ] Leave only the test file changes from RED.
- [ ] Verify GREEN: `node --test test/glossary-diagnosis-terms.test.js` — expected: **PASS**.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `Diagnosis Round` is in the required-term list
- [ ] `node --test test/glossary-diagnosis-terms.test.js` passes
- [ ] `GLOSSARY.md` was not modified
- [ ] Relationship pin (if added) still matches Review Engine / not-a-Supervised-Review-Round

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 5: Focused three-file regression run

*(Non-testable verification-only step — no path creates, modifies, deletes, or renames. No new assertions.)*

- [ ] From repo root, run exactly:

```bash
node --test test/bounded-worker-recovery.test.js test/explore-pipeline-selector.test.js test/glossary-diagnosis-terms.test.js
```

- [ ] Expected: exit 0. If any failure occurs, fix it in the owning Step 1–4 files (do not add Step-5-only assertions). Re-run until green.

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] Focused three-file suite exits 0
- [ ] No further source or test edits were introduced solely in this step
- [ ] Combined run still encodes Step 1–4 pins without a second recovery implementation or Explore write authority

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass (empty commit not required if the tree is clean). No browser verification required at this step.

---

## Manual verification (out of band; not plan checkboxes)

After all steps are applied, optional smoke (from design Manual Verification) may be run by a human:

- Force one supervised failed/cancelled Auto path and confirm one Diagnosis Round, at most one same-worker re-dispatch, pending idea-list item, no Explore writes.
- Outside Explore Auto, confirm cancellation still stops cleanly with no diagnosis.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | red | red | 1 | n/a | |
| 1 | green | green | 2 | assertion | Cancellation exception wording was incomplete; the production-only correction then passed. |
| 2 | red | red | 2 | assertion | Initial diagnosis-window anchor was corrected; existing tests remained green. |
| 2 | green | green | 6 | assertion | Bounded-diagnosis contract wording was refined until the required verification passed. |
