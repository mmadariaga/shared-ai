# supervised-artifact-gate-suppression

## Goal

Add optional supervised mode to the shared artifact feedback gate so explore Auto auto-executes next-action at both item-10 gate sites without a user picker, while standalone `/sai-1-spec` and `/sai-2-design` stay interactive by omitting `mode`.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "supervised-artifact-gate-suppression"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Shared gate mode parameter and supervised auto-proceed

*(Testable step — RED → GREEN. Structural node:test pins on the shared gate policy and three coordinator/worker suites co-land with the policy edit per D4 / ADR 0149.)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here.

- [ ] Append the following new tests to `test/explore-pipeline-selector.test.js` (after the existing gate-parameter tests near the `## Parameters` pin, around the block that matches `` `artifacts` `` / `` `proceed-label` `` / `` `next-action` ``):

```js
test('shared gate documents optional mode with closed vocabulary and invalid-mode STOP', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /## Parameters[\s\S]{0,800}`mode`/i,
    'Parameters must document optional mode');
  assert.match(gate, /`mode`[\s\S]{0,400}(?:interactive|`interactive`)[\s\S]{0,120}(?:supervised|`supervised`)/i,
    'mode vocabulary must be interactive | supervised');
  assert.match(gate, /omitted[\s\S]{0,200}interactive|when omitted[\s\S]{0,120}interactive/i,
    'omitted mode must default to interactive');
  assert.match(gate, /(?:invalid|non-empty)[\s\S]{0,200}mode[\s\S]{0,200}STOP/i,
    'invalid non-empty mode must STOP');
  assert.match(gate, /(?:does not|MUST NOT|SHALL NOT)[\s\S]{0,120}default[\s\S]{0,80}invalid/i,
    'invalid mode must not silently default');
  assert.doesNotMatch(gate, /detect(?:s|ing)?[\s\S]{0,80}(?:invocation context|caller identity|conversation history)[\s\S]{0,80}mode/i);
});

test('supervised mode auto-executes next-action exactly once without picker, free-text, iteration increment, or approval writes', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /## Supervised mode is a sequencing auto-proceed/i,
    'supervised auto-proceed must be single-sourced under a clear heading');
  assert.match(gate, /mode\s*=\s*`?supervised`?[\s\S]{0,400}next-action[\s\S]{0,200}exactly once/i,
    'supervised path must execute next-action exactly once');
  assert.match(gate, /mode[\s\S]{0,80}supervised[\s\S]{0,300}(?:SHALL NOT|MUST NOT|does not)[\s\S]{0,120}(?:option-picker|picker)/i,
    'supervised mode must not present the option-picker');
  assert.match(gate, /mode[\s\S]{0,80}supervised[\s\S]{0,300}(?:SHALL NOT|MUST NOT|does not)[\s\S]{0,120}free-text/i,
    'supervised mode must not use the free-text path');
  assert.match(gate, /mode[\s\S]{0,80}supervised[\s\S]{0,400}(?:iteration counter)[\s\S]{0,120}(?:remain(?:s)? 0|unchanged|not increment)/i,
    'supervised mode must not increment the iteration counter');
  assert.match(gate, /(?:SHALL NOT|MUST NOT|does not)[\s\S]{0,80}write[\s\S]{0,40}\.openspec\.yaml/i,
    'gate must never write .openspec.yaml');
  assert.match(gate, /(?:failed|cancelled)[\s\S]{0,200}(?:never|do not|does not)[\s\S]{0,120}(?:auto-proceed|next-action)/i,
    'failed/cancelled must never auto-proceed');
});

test('supervised placement keeps gate after decision summary and preserves post-proceed report order', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /mode[\s\S]{0,80}supervised[\s\S]{0,300}decision summary/i,
    'supervised placement remains after the decision summary');
  assert.match(gate, /(?:post-proceed|after[\s\S]{0,40}proceed)[\s\S]{0,200}report/i,
    'placement prose must preserve post-proceed report order');
  assert.doesNotMatch(gate, /supervised[\s\S]{0,200}reports[\s\S]{0,80}before[\s\S]{0,80}auto-proceed/i);
});

test('interactive mode preserves Give feedback (Recommended) first and proceed second', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const presentation = gate.slice(
    gate.indexOf('## Present the gate'),
    gate.indexOf('## On selecting the feedback option') !== -1
      ? gate.indexOf('## On selecting the feedback option')
      : gate.indexOf('## On a direct free-text reply'),
  );

  assert.match(presentation, /mode[\s\S]{0,80}interactive|When `mode` is `interactive`/i,
    'presentation must be mode-qualified for interactive');
  assert.match(presentation, /Give feedback \(Recommended\)/);
  assert.ok(
    presentation.indexOf('Give feedback (Recommended)') < presentation.indexOf('proceed-label')
      || presentation.indexOf('Give feedback (Recommended)') < presentation.indexOf('`proceed-label`'),
    'feedback option must precede proceed-label',
  );
});
```

- [ ] Append the following new tests to `test/spec-coordinator-worker.test.js` (after the existing `sai-1 feedback gate advertises…` test):

```js
test('shared gate mode pins remain available to the spec suite (policy-only Step 1)', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const coordinator = artifact('sai/commands/spec/coordinator.md');

  assert.match(gate, /`mode`[\s\S]{0,400}`interactive`[\s\S]{0,120}`supervised`/i);
  assert.match(gate, /## Supervised mode is a sequencing auto-proceed/i);
  assert.match(coordinator, /artifacts\s*=\s*proposal\.md,\s*specs\/\*\*/);
  assert.match(coordinator, /proceed-label\s*=\s*Finish step/);
  assert.match(coordinator, /next-action\s*=\s*the existing mandatory stop/);
  assert.doesNotMatch(coordinator, /mode\s*=\s*supervised/);
  assert.doesNotMatch(coordinator, /mode\s*=\s*interactive/);
});
```

- [ ] Append the following new tests to `test/design-coordinator-worker.test.js` (after the existing shared feedback gate presentation test):

```js
test('shared gate mode pins remain available to the design suite (policy-only Step 1)', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(gate, /`mode`[\s\S]{0,400}`interactive`[\s\S]{0,120}`supervised`/i);
  assert.match(gate, /## Supervised mode is a sequencing auto-proceed/i);
  assert.match(gate, /Stop the loop and perform `next-action` exactly once/);
  assert.match(coordinator, /artifacts\s*=\s*design\.md,\s*tasks\.md,\s*interfaces\.md/);
  assert.match(coordinator, /proceed-label\s*=\s*Continue/);
  assert.doesNotMatch(coordinator, /mode\s*=\s*supervised/);
  assert.doesNotMatch(coordinator, /mode\s*=\s*interactive/);
});
```

- [ ] Verify RED: run `node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: **assertion failure** on the new mode/supervised pins (exit ≠ 0 AND failure attributable to missing `mode` / supervised auto-proceed prose in `sai/policies/artifact-feedback-gate.md`, NOT a setup/import/compilation error).
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the new tests pass against current sources, or the failure is not an assertion failure, STOP and report to the user. Do not paste the GREEN edits below.

##### GREEN phase (only after RED is verified)

- [ ] Replace the entire `## Parameters (supplied inline by the fetching body)` section in `sai/policies/artifact-feedback-gate.md` with:

```markdown
## Parameters (supplied inline by the fetching body)

The fetching body MUST supply these three required parameters at the fetch site:

- `artifacts` — the list of artifact names/globs written in this step, open to feedback.
- `proceed-label` — the full-word label for the proceed option (e.g. `Finish step`, `Continue`).
- `next-action` — the action to perform when the user selects the proceed option (interactive) or when supervised auto-proceed runs.

The fetching body MAY also supply:

- `mode` — optional. Closed vocabulary exactly `interactive` | `supervised`. When omitted, the gate behaves as `interactive`. This omitted default is a bounded exception to the missing-parameter STOP rule below. When a non-empty `mode` value other than `interactive` or `supervised` is supplied, STOP and ask for a valid `mode` — do NOT default that invalid value to `interactive` and do NOT execute supervised auto-proceed.

If any of the three required parameters is missing, STOP and ask for it — do not assume a default (Isolation Mode: "if required information is missing, ask for it"). The gate MUST NOT detect invocation context, caller identity, or conversation history at runtime to choose a mode; mode is only the value supplied (or defaulted) at the fetch site. The `next-action` value is always the one supplied by the current fetch site; different fetch sites MAY supply different next-actions for the same proceed-label.
```

- [ ] In `## Machine-feedback adapter (supervised phases)`, replace the final paragraph that begins `Defer the ordinary user-facing gate…` with:

```markdown
Defer the ordinary user-facing gate while another review round is required. After the review round converges, exhausts its one-round cap, or is interrupted by worker failure:

- When `mode` is `interactive` (including the omitted-mode default), present that gate for the first time, unchanged at iteration 0. Its first ordered labels remain `Give feedback (Recommended)` followed by `proceed-label` (for sai-1, `Finish step`).
- When `mode` is `supervised`, do NOT present the picker, emit the free-text prompt, accept the free-text path, or increment the iteration counter; execute supervised auto-proceed per `## Supervised mode is a sequencing auto-proceed, not gate removal`. The iteration counter remains 0 for the entire supervised run. Supervised auto-proceed runs only after deferred-gate resolution on a live phase path — never over a worker `failed` or `cancelled` result.
```

- [ ] Replace the entire `## Present the gate` section with:

```markdown
## Present the gate

When `mode` is `supervised`, do NOT present the option-picker and do NOT offer feedback or proceed choices to the user; supervised next-action execution is owned solely by `## Supervised mode is a sequencing auto-proceed, not gate removal`.

When `mode` is `interactive` (including the omitted-mode default), present exactly two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md`. The question text is:

> Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.

Replace `{artifacts}` with the supplied artifact list and render the question in the user's language per `sai/policies/remember.md`.

1. **`Give feedback (Recommended)` when in-conversation iteration counter == 0, else `Give more feedback`** — feedback on the artifacts written in this step. Name every entry in `artifacts` so the user knows exactly what is open to feedback. The feedback option description is `Feedback on {artifacts}; you can also type feedback directly in the free-text box.` Replace `{artifacts}` with the supplied artifact list and render the description in the user's language per `sai/policies/remember.md`. The feedback option is emitted FIRST in every presentation (ordering is unaffected by the iteration counter).

The question text, feedback option description, proceed option label, proceed option description, and harness option-picker path stay byte-for-byte identical across every iteration; only this short label changes between the first presentation and any re-presentation. On every re-presentation after a feedback turn (iteration counter > 0), NO option carries the `Recommended` marker — neither the feedback option nor the proceed option.

2. **`proceed-label`** — the step-specific proceed option.
```

- [ ] Replace the entire `## On a direct free-text reply` section with:

```markdown
## On a direct free-text reply

When `mode` is `supervised`, the gate does NOT emit the free-text question, free-text option description, or free-text channel advertisement, and does NOT accept a free-text feedback path.

When `mode` is `interactive` (including the omitted-mode default), a non-empty reply supplied through the harness-provided free-text channel that selects neither declared option is potential feedback, not an option selection. Pass that text directly to `## On "Give feedback"` below and apply the existing per-item split, legitimacy judgment, artifact-only edits, discard reporting, summary recomputation, iteration increment, and gate re-offer behavior; directly, no additional clean feedback-text prompt is emitted for this direct free-text path.

An empty reply is not a direct free-text reply. When the user selects `Give feedback` or `Give more feedback`, use the existing empty-turn follow-up path below so surfaces without a free-text channel remain supported.
```

- [ ] Replace the entire `## On proceed (`proceed-label`)` section with:

```markdown
## On proceed (`proceed-label`)

When `mode` is `interactive` (including the omitted-mode default), stop the loop and perform `next-action` exactly once (the value supplied by the current fetch site — e.g. standalone sai-1 mandatory stop; standalone sai-2 design completion sentence and stop).

When `mode` is `supervised`, user selection does not occur; next-action execution without a user selection is owned solely by `## Supervised mode is a sequencing auto-proceed, not gate removal`. Do not substitute a different fetch site's next-action.
```

- [ ] Append this new section at the end of `sai/policies/artifact-feedback-gate.md` (after `## On proceed`):

```markdown
## Supervised mode is a sequencing auto-proceed, not gate removal

When `mode` is `supervised`, the gate keeps its role as a phase sequencer: after the deferred-gate condition resolves (convergence, one-round cap exhaustion, or empty findings) on a live phase path, perform the supplied `next-action` exactly once without presenting the option-picker, without emitting or accepting the free-text path, and without incrementing the iteration counter (the counter remains 0 for the whole supervised run). Supervised mode MUST NOT delete the gate call, invent a combined post-sai-2 gate, write `.openspec.yaml`, ask for or record approval, or act as an approval gate. Supervised mode adds no new conversation text of its own; visibility remains the reports the fetching body already emits at those points. Execution of `next-action` under supervised mode is owned by this shared gate policy, not reimplemented inline by the fetching body.

Gate application still sits after the step's decision summary. Reports the fetching body already defines as part of proceed (for example explore item 10's phase-transition report after the spec artifact gate proceeds, and the design-phase counterparts) keep the order that body already specifies — this placement does not reorder those post-proceed reports before auto-proceed.

A phase worker `failed` or `cancelled` result never reaches this branch: do not present the ordinary gate and do not auto-execute next-action over a failed or cancelled worker. Invalid non-empty `mode` STOP (see Parameters) is an authoring-fault path, not a normal supervised runtime interruption.
```

- [ ] Preserve every existing interactive label, description, `## On "Give feedback"` heading (byte-identical), iteration-aware Recommended marker rule, and "Not an approval gate" prohibition. Do not edit standalone coordinators in this step. Do not add explore `mode = supervised` supply yet (Step 2). Do not edit worker coexistence prose yet (Step 3).

- [ ] Verify GREEN: run `node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: PASS (exit 0). Optionally run `npm test`.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` fails as expected on new mode pins
- [x] GREEN verified — same three-file command passes
- [x] `sai/policies/artifact-feedback-gate.md` documents optional `mode`, invalid-mode STOP, supervised exact-once next-action, no `.openspec.yaml` writes, failed/cancelled non-advance, and post-proceed placement
- [x] Standalone `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` still omit `mode`

*(No Human checks — service-side instruction/policy step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Explore item 10 supplies supervised mode at both gate sites

*(Testable step — RED → GREEN. Structural pins co-land with explore instruction edits.)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports.

- [ ] Append the following new tests to `test/explore-pipeline-selector.test.js`:

```js
test('explore item 10 supplies mode = supervised at both gate application sites', () => {
  const source = fs.readFileSync(
    path.join(repoRoot, 'sai/commands/explore/instructions.md'),
    'utf8'
  );

  assert.match(
    source,
    /artifacts\s*=\s*proposal\.md,\s*specs\/\*\*[\s\S]{0,400}proceed-label\s*=\s*Finish step[\s\S]{0,400}mode\s*=\s*supervised/i,
    'spec-phase gate site must supply mode = supervised with existing parameters',
  );
  assert.match(
    source,
    /artifacts\s*=\s*design\.md,\s*tasks\.md,\s*interfaces\.md[\s\S]{0,500}proceed-label\s*=\s*Continue[\s\S]{0,500}mode\s*=\s*supervised/i,
    'design-phase gate site must supply mode = supervised with existing parameters',
  );
  assert.match(
    source,
    /next-action[\s\S]{0,120}(?:spec-to-design phase transition|phase transition)[\s\S]{0,200}mode\s*=\s*supervised|mode\s*=\s*supervised[\s\S]{0,200}(?:spec-to-design|phase transition)/i,
    'spec-site next-action remains phase transition under supervised mode',
  );
  assert.match(
    source,
    /next-action[\s\S]{0,200}overview generation[\s\S]{0,200}supervised design terminal[\s\S]{0,200}mode\s*=\s*supervised|mode\s*=\s*supervised[\s\S]{0,300}overview generation/i,
    'design-site next-action remains overview generation + supervised terminal',
  );
});

test('explore supervised emission order is decision summary then gate auto-proceed then item 10 reports', () => {
  const source = fs.readFileSync(
    path.join(repoRoot, 'sai/commands/explore/instructions.md'),
    'utf8'
  );

  assert.match(
    source,
    /After the spec artifact gate proceeds[\s\S]{0,200}Phase transition - supervised spec phase/i,
    'phase-transition report remains after the spec gate proceeds',
  );
  assert.match(
    source,
    /Supervised sai-1 done in openspec\/changes\/\{name\}\//,
    'Supervised sai-1 done report remains part of post-proceed marks',
  );
  assert.match(
    source,
    /Continue[\s\S]{0,200}overview-generation|overview generation[\s\S]{0,200}Supervised sai-2 done/i,
    'design Continue / overview generation precedes Supervised sai-2 done',
  );
  assert.doesNotMatch(
    source,
    /Phase transition - supervised spec phase[\s\S]{0,300}spec artifact gate proceeds/i,
  );
});

test('explore does not invent active-interval stage enumeration prose for the picker', () => {
  const source = fs.readFileSync(
    path.join(repoRoot, 'sai/commands/explore/instructions.md'),
    'utf8'
  );

  assert.match(source, /reject duplicate starts for the full active interval/i);
  assert.doesNotMatch(
    source,
    /active supervision interval[\s\S]{0,200}user-facing artifact feedback picker/i,
  );
});
```

- [ ] Verify RED: run `node --test test/explore-pipeline-selector.test.js` — expected: **assertion failure** on missing `mode = supervised` at explore gate sites (and any new ordering pins that current prose does not yet satisfy). Confirm `test/spec-coordinator-worker.test.js` and `test/design-coordinator-worker.test.js` still pass from Step 1.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] In `sai/commands/explore/instructions.md` item 10, keep the single pre-dispatch Fetch of `@sai/policies/artifact-feedback-gate.md` unchanged.

- [ ] At the **spec-phase** gate application site (the bullet that opens the ordinary user-facing artifact gate after supervised spec rounds), replace the parameter supply so it reads exactly (prose may wrap; parameter names and values must match):

```text
Open the shared artifact feedback gate for the first time only after the round converges or the one-round cap is exhausted (or findings are empty), supplying `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, `next-action = the spec-to-design phase transition below`, and `mode = supervised` — the standalone mandatory stop is not the supervised next-action. Because `mode = supervised`, the shared gate auto-executes that next-action without presenting the picker, free-text path, or incrementing the iteration counter (see `sai/policies/artifact-feedback-gate.md`). Do not inline auto-proceed outside the shared policy.
```

- [ ] At the **design-phase** gate application site(s) — both the DesignMachineFeedbackAdapter first-gate sentence and the design round / cap-exhaustion present-gate wording — supply the same four-parameter pattern:

```text
…supplying `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, `next-action = the post-gate overview generation and supervised design terminal below`, and `mode = supervised`. Because `mode = supervised`, the shared gate auto-executes Continue (overview generation + supervised design terminal) without presenting the picker; do not inline auto-proceed outside the shared policy. Cap exhaustion still presents only via the shared gate's supervised auto-proceed (non-failure), never a user-facing iteration-0 picker under Auto.
```

Rewrite any remaining item-10 sentence that still says the ordinary user-facing gate is presented at iteration 0 under supervised Auto so it is mode-qualified: under `mode = supervised` the gate auto-proceeds; the interactive iteration-0 presentation remains only for standalone `/sai-2-design` / omitted mode.

- [ ] Preserve D5 emission order byte-for-byte in meaning:
  1. decision summary / round outcome inputs to the gate
  2. shared gate auto-proceed / next-action
  3. then existing reports (`Phase transition - supervised spec phase`, `Supervised sai-1 done…`, Autonomy audit — supervised spec phase, design counterparts, `Supervised sai-2 done…`, `sai-3 was not run.`)

  Do **not** move those reports before auto-proceed. Do **not** invent active-supervision interval stage enumeration prose inside `explore/instructions.md` (selector delta owns that). Do **not** add suppression-only chatter. Do **not** edit standalone coordinators.

- [ ] Verify GREEN: run `node --test test/explore-pipeline-selector.test.js` — expected: PASS. Also run `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: PASS.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — explore suite fails on missing `mode = supervised` site supply
- [x] GREEN verified — `node --test test/explore-pipeline-selector.test.js` passes
- [x] Coordinator suites from Step 1 still pass
- [x] Both explore gate sites include `mode = supervised`; post-proceed report order preserved; no new suppression-only strings

*(No Human checks — service-side instruction step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Mode-qualify worker-loop coexistence prose

*(Testable step — RED → GREEN. Documentation-only worker edits + coordinator/worker suite pins.)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports.

- [ ] Append the following new tests to `test/spec-coordinator-worker.test.js`:

```js
test('spec worker coexistence cross-references mode-dependent gate behavior without receiving mode', () => {
  const worker = artifact('sai/commands/spec/worker.md');
  const coordinator = artifact('sai/commands/spec/coordinator.md');

  assert.match(
    worker,
    /mode[\s\S]{0,80}(?:interactive|supervised)|interactive[\s\S]{0,120}supervised|supervised[\s\S]{0,200}auto-proceed/i,
    'worker coexistence must cross-reference mode-dependent gate behavior',
  );
  assert.match(
    worker,
    /(?:does not|never|MUST NOT)[\s\S]{0,80}(?:receive|branch on|evaluate)[\s\S]{0,40}mode/i,
    'workers must not receive or branch on mode',
  );
  assert.doesNotMatch(coordinator, /mode\s*=\s*(?:supervised|interactive)/);
  assert.match(coordinator, /proceed-label\s*=\s*Finish step/);
  assert.match(coordinator, /next-action\s*=\s*the existing mandatory stop/);
});
```

- [ ] Append the following new tests to `test/design-coordinator-worker.test.js`:

```js
test('design worker coexistence cross-references mode-dependent gate behavior without receiving mode', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(
    worker,
    /mode[\s\S]{0,80}(?:interactive|supervised)|interactive[\s\S]{0,120}supervised|supervised[\s\S]{0,200}auto-proceed/i,
    'design worker coexistence must cross-reference mode-dependent gate behavior',
  );
  assert.match(
    worker,
    /(?:does not|never|MUST NOT)[\s\S]{0,80}(?:receive|branch on|evaluate)[\s\S]{0,40}mode/i,
    'design worker must not receive or branch on mode',
  );
  assert.doesNotMatch(coordinator, /mode\s*=\s*(?:supervised|interactive)/);
  assert.match(coordinator, /proceed-label\s*=\s*Continue/);
  assert.match(
    coordinator,
    /next-action\s*=\s*the existing design completion sentence and stop/,
  );
  assert.match(
    coordinator,
    /Design done in openspec\/changes\/\{name\}\/\. Run \\?`\/sai-3-implement \{name\}\\?` \*\*in a new chat\*\* when ready\./i,
  );
  assert.doesNotMatch(
    coordinator,
    /mode\s*=\s*supervised[\s\S]{0,200}overview generation/,
  );
});
```

- [ ] Verify RED: run `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/explore-pipeline-selector.test.js` — expected: **assertion failure** on worker coexistence mode cross-reference pins.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] In `sai/commands/spec/worker.md`, replace the final paragraph of `### Worker-owned planning-artifact review` (the coexistence paragraph beginning `After the automatic loop settles…`) with:

```markdown
After the automatic loop settles, the coordinator-owned prose feedback gate remains the post-loop surface, and its behavior is mode-dependent at the fetch site (see `sai/policies/artifact-feedback-gate.md`): when the fetch site is interactive or omits `mode`, the coordinator still presents that gate at iteration 0 after the worker-owned loop ends; when the fetch site supplies `mode = supervised`, that gate auto-proceeds with no picker and this worker neither presents nor suppresses the picker. A user-requested pass from an interactive gate uses the same fresh isolation, reviewed/reference sets, finding contract, worker-owned processing, and evidence semantics, but is subject to neither automatic-loop cap. The worker-owned loop coexists with and never replaces the supervised pipeline's independent convergence loop or its `MachineFeedbackAdapter`. Workers never receive `mode`, never branch on mode, and gain no new lifecycle field or picker logic.
```

- [ ] In `sai/commands/design/worker.md`, replace the coexistence paragraph beginning `After the automatic loop settles, retain the coordinator-owned prose feedback gate unchanged…` with:

```markdown
After the automatic loop settles, the coordinator-owned prose feedback gate remains the post-loop surface, and its behavior is mode-dependent at the fetch site (see `sai/policies/artifact-feedback-gate.md`): when the fetch site is interactive or omits `mode`, the coordinator still presents that gate at iteration 0 after the worker-owned loop ends; when the fetch site supplies `mode = supervised`, that gate auto-proceeds with no picker and this worker neither presents nor suppresses the picker. A user-requested pass from an interactive gate uses the same isolation, finding, processing, and evidence rules without either automatic-loop cap. Later feedback edits or High findings never clear or reopen an emitted `review` mark. The worker-owned loop coexists with and never replaces the supervised pipeline's independent convergence loop or its `MachineFeedbackAdapter`. Workers never receive `mode`, never branch on mode, and gain no new lifecycle field or picker logic. Under supervision the design worker marks no routed-list steps: no adapter-declared plan, no plan-based list, no step marking.
```

- [ ] Do not couple workers to `MachineFeedbackAdapter` ownership changes, do not change caps, isolation, or overview lifecycle, and do not edit standalone coordinator next-actions (spec: Finish step / mandatory stop; design: Continue → completion sentence only).

- [ ] Verify GREEN: run `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/explore-pipeline-selector.test.js` — expected: PASS. Then run full `npm test` — expected: PASS.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — worker coexistence mode pins fail against pre-edit workers
- [x] GREEN verified — three structural suites pass
- [x] Full `npm test` passes
- [x] Spec and design workers cross-reference mode-dependent gate behavior; coordinators still omit `mode`; standalone design next-action remains completion sentence (not explore overview generation)

*(No Human checks — service-side documentation step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.
)
