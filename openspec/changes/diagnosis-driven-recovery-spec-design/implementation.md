# diagnosis-driven-recovery-spec-design

## Goal

Opt standalone `/sai-1-spec` and `/sai-2-design` into shared non-clean-closure diagnosis: extend the command-runner Bounded Recovery seam for planning inspection and per-cause-surface dual-channel exclusivity, clarify worker-core classification for planning consumers, qualify both planning coordinators (clean-route blind / non-clean path-bounded read), add worker classification and `continue_after_recovery` on both planning workers, and pin the behavior with co-located structural tests — without durable recovery metadata, baseline `openspec/specs/**` edits, or Explore/Build card changes.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "diagnosis-driven-recovery-spec-design"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Extend shared Bounded Recovery for planning non-clean inspection

*(Testable step — RED → GREEN. Co-locate runner prose with `test/bounded-worker-recovery.test.js` pins per design D7.)*

**Expertise:** Markdown instruction contracts + Node.js `node:test` structural assertions. Prefer widening matchers when wording expands; do not rewrite production text to match stale absolute phrases. Do not edit baseline `openspec/specs/**`.

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full production prose here.

- [x] Append the following new test cases to `test/bounded-worker-recovery.test.js` (after the existing dual-inspection test, before the ordinary-continuation test is fine). Keep existing tests intact; only **widen** the dual-inspection matcher if it would fail against the planned GREEN wording (see GREEN notes).

```js
test('planning non-clean inspection boundary and adapter surface declaration live in the runner', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /non[- ]clean[\s\S]{0,200}(?:failed|closure)/i,
    'runner must name the non-clean closure route');
  assert.match(runner, /(?:standalone|planning)[\s\S]{0,200}(?:adapter|inspection)/i,
    'runner must address standalone/planning adapters');
  assert.match(runner, /(?:worker[- ]owned|artifact surface|authorized read set)/i,
    'adapters must declare a worker-owned artifact surface / authorized read set');
  assert.match(runner, /same[- ]worker/i,
    'same-worker correction must remain named');
  assert.match(runner, /(?:clean[\s\S]{0,120}(?:completed|needs_input|cancelled|progress|notice)|artifact[- ]blind)/i,
    'clean-route blindness must be retained');
  assert.match(runner, /(?:ephemeral|conversation state|not[\s\S]{0,80}(?:written|persisted)[\s\S]{0,80}(?:artifact|metadata))/i,
    'diagnosis must remain ephemeral — no durable recovery markers');
});

test('dual-channel exclusivity is per cause surface with no unresolved static fallback', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /(?:per[- ](?:cause[- ])?surface|cause surface)/i,
    'channel selection must be per cause surface');
  assert.match(runner, /(?:authorized read set|read set)[\s\S]{0,300}(?:inspection|inspect)/i,
    'inspection applies when the cause surface is in the authorized read set');
  assert.match(runner, /(?:phase[- ]static|design-overview-repair)[\s\S]{0,300}(?:outside|not[\s\S]{0,40}(?:in|within)|∉|blind)/i,
    'phase-static matching applies when the surface is outside the read set');
  assert.match(runner, /(?:no|not|never)[\s\S]{0,120}fall[\s-]?back[\s\S]{0,200}(?:phase[- ]static|static|design-overview-repair)|(?:unresolved)[\s\S]{0,200}(?:no|not|never)[\s\S]{0,120}(?:phase[- ]static|static|fall[\s-]?back)/i,
    'authorized-but-unresolved inspection must not fall back to a static row');
  assert.match(runner, /channel selection[\s\S]{0,200}(?:before|precedes)[\s\S]{0,120}(?:key|diagnosis)/i,
    'channel selection must precede key derivation');
  assert.match(runner, /design-overview-repair/,
    'sole overview registry identity must remain');
  assert.equal(
    (runner.match(/\| design-overview-repair \|/g) || []).length,
    1,
    'exactly one design-overview-repair registry row'
  );
});
```

- [x] Verify RED: run `node --test test/bounded-worker-recovery.test.js` — expected: **assertion failure** on the new planning/exclusivity pins (exit ≠ 0). Existing cases should still pass; if the dual-inspection wording matcher fails only because terminology shifted, widen that matcher in RED (not GREEN) so the failure is solely missing planning prose.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [x] Edit `sai/orchestration/command-runner.md` **Bounded Recovery** section. Insert a new numbered item (or extend item 4) that states all of the following as normative prose — do **not** restate the three routing diagnoses, three-slot ledger, zero-attempt branches, `continue_after_recovery`, or the sole registry table elsewhere. Keep the existing registry table and match algorithm byte-stable except where exclusivity language must cross-reference it.

Required normative content (wording may vary; structural tests pin concepts, not a single sentence):

1. **Planning non-clean triggers (after resolution only):** For an opted-in standalone planning adapter (`recovery_policy: true`), a non-clean closure is any structurally valid `failed` result, a `completed` result disproven by coordinator verification, or a `completed` result carrying a STOP. Only that route may authorize the coordinator to read the adapter-declared worker-owned artifact surface.
2. **Clean-route retention:** Clean `completed`, `needs_input`, `cancelled`, progress events, notices, and every pre-resolution result retain existing artifact-blind routing — no artifact reads on those paths.
3. **Adapter surface declaration:** A planning phase adapter that opts in SHALL declare (a) its worker-owned artifact surface / authorized non-clean read set and (b) that diagnosed correction is a same-worker re-dispatch. Phase cards MUST NOT restate shared ledger, diagnosis, or budget rules.
4. **Per-cause-surface dual-channel exclusivity:** Channel selection is per cause surface and precedes key derivation (one closure → at most one diagnosis key):
   - When the suspected cause surface is **inside** the coordinator's authorized non-clean read set → use **inspection-derived** Cause Locus and diagnosis key; do **not** also match a phase-static row for that surface.
   - When the suspected cause surface is **outside** that read set (e.g. design overview while the design coordinator's read set is main planning artifacts only) → use the registered phase-static row (`design-overview-repair`) when its closed-field and path criteria match.
   - A single design adapter MAY use inspection for main planning artifacts and phase-static matching for overview — two surfaces, one channel each.
   - If inspection is **authorized** for the suspected surface but cannot establish a concrete safe cause → **unresolved**, zero attempts, and **no** fallback to the phase-static row.
5. **Ephemeral diagnosis:** Diagnosis keys, Cause Locus, ledger state, and repair history remain coordinator conversation state only. No diagnosis, repair marker, or recovery counter is written to an artifact or metadata file.
6. **Unchanged invariants:** three routing diagnoses; three-slot distinct-diagnosis ledger; zero-attempt branches; `continue_after_recovery`; sole registry row identity `design-overview-repair`; no replacement worker from recovery.

Cross-link ADR 0166 (`docs/adr/0166-per-cause-surface-dual-channel-exclusivity.md`) only if a Related-style prose note already exists in the runner; do not invent a new ADR section inside the runner.

- [x] If the existing test `recovery routes Cause Locus diagnoses through dual inspection channels` still uses the narrow phrase `(?:dual|two)[\s\S]{0,140}inspection[\s\S]{0,140}(?:channel|path)` and GREEN prose legitimately prefers "inspection vs phase-static" exclusivity language, **widen** that matcher to also accept the new exclusivity vocabulary (e.g. allow `inspection` + `phase-static` / `channel` within a reasonable window). Do not delete the Cause Locus / in-scope / out-of-scope / unresolved pins.

- [x] Verify GREEN: run `node --test test/bounded-worker-recovery.test.js` — expected: **PASS** (exit 0).

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/bounded-worker-recovery.test.js` fails as expected on new pins
- [x] GREEN verified — `node --test test/bounded-worker-recovery.test.js` passes
- [x] Runner still contains exactly one `| design-overview-repair |` registry row
- [x] No baseline file under `openspec/specs/**` was modified

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Clarify worker-core failure classification for planning consumers

*(Testable step — RED → GREEN. Minimal planning-facing clarification only.)*

##### RED phase

- [x] Add (or extend) a pin in `test/bounded-worker-recovery.test.js` that fails until worker-core states classification is not an eligibility gate and remains lifecycle-only for planning:

```js
test('worker-core states failure_class is evidence not an eligibility gate and stays lifecycle-only', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  assert.match(lifecycle, /failure_class[\s\S]{0,260}(?:not[\s\S]{0,80}(?:eligibility|gate)|prior|diagnostic)/i,
    'failure_class must be diagnostic evidence, not the recovery eligibility gate');
  assert.match(lifecycle, /(?:not[\s\S]{0,120}persist|lifecycle[- ]only|not[\s\S]{0,80}(?:written|write)[\s\S]{0,80}artifact)[\s\S]{0,200}(?:failure_class|unrecoverable|diagnosis)/i,
    'classification and recovery metadata must not be persisted into artifacts');
  assert.match(lifecycle, /outer-envelope-violation[\s\S]{0,200}(?:coordinator|never a worker)/i,
    'outer-envelope-violation remains coordinator-only');
});
```

If `worker failures expose closed classification metadata after resolution only` already covers vocabulary and pre-resolution omission, leave it unchanged. If GREEN only needs a single cross-reference sentence and the new test would be redundant with existing runner pins, keep the new test but allow the GREEN sentence to satisfy both worker-core and a runner cross-ref.

- [x] Verify RED: `node --test test/bounded-worker-recovery.test.js` — expected: assertion failure on the new pin.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase

- [x] Edit `sai/orchestration/worker-core.md` post-resolution failure section. Prefer a **single** planning-facing clarification paragraph (or one cross-reference sentence) rather than duplicating Bounded Recovery. Required concepts:

  - Closed `failure_class` + boolean `unrecoverable` remain worker-authored on post-resolution `failed` only.
  - Classification is **worker-authored evidence / a diagnostic prior**, not an eligibility gate (eligibility stays in Bounded Recovery / coordinator).
  - Routing diagnosis, Cause Locus, and `diagnosis_key` remain coordinator-owned and MUST NOT appear as worker payload fields.
  - `outer-envelope-violation` remains coordinator-only / never worker-authorable.
  - Planning workers MUST NOT persist `failure_class`, `unrecoverable`, diagnosis keys, attempt counts, or repair history into proposal/spec/design/task/interface/overview/glossary/`.openspec.yaml` artifacts (lifecycle-only).
  - If worker-core already states these verbatim, add only a one-line cross-reference to Bounded Recovery for planning consumers — do not duplicate the ledger rules.

- [x] Verify GREEN: `node --test test/bounded-worker-recovery.test.js` — expected: PASS.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — new pin fails against pre-GREEN worker-core
- [x] GREEN verified — `node --test test/bounded-worker-recovery.test.js` passes
- [x] Pre-resolution omission and closed vocabulary pins remain green

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Opt-in and qualify planning coordinators

*(Testable step — RED → GREEN. Will-break: design absolute no-I/O test must be clean-route-qualified.)*

##### RED phase

- [x] Update `test/design-coordinator-worker.test.js` test `routed design coordinator has no technical I/O and owns only lifecycle routing`:

  - Replace the absolute ban expectation with a **clean-route** ban plus an explicit **non-clean** path-bounded exception.
  - Keep no-write / no technical-design-decision pins.
  - Example shape (adjust regex to match GREEN prose):

```js
test('routed design coordinator has no technical I/O and owns only lifecycle routing', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  // Clean route remains blind
  assert.match(coordinator, /(?:clean route|on the clean)[\s\S]{0,400}(?:do not|shall not|must not)[\s\S]{0,200}(?:read|inspect)[\s\S]{0,200}(?:artifact|design)/i);
  assert.match(coordinator, /do not write any file|shall not write|never write/i);
  assert.match(coordinator, /technical design decisions/i);
  assert.match(coordinator, /continue_after_notice/);
  // Non-clean exception is path-bounded
  assert.match(coordinator, /non[- ]clean[\s\S]{0,400}(?:design\.md|tasks\.md|interfaces\.md)/i);
  assert.match(coordinator, /recovery_policy\s*:\s*true/);
});
```

- [x] Update `test/spec-coordinator-worker.test.js` test `coordinator declares lifecycle-only ownership and the exact two-string envelope`:

  - Keep envelope / lifecycle / two-string pins.
  - Widen so lifecycle-only ownership is **clean-route** qualified and a **non-clean diagnosis** exception is allowed.
  - Add positive pins:

```js
  assert.match(coordinator, /recovery_policy\s*:\s*true/,
    'spec coordinator opts into shared recovery');
  assert.match(coordinator, /proposal\.md[\s\S]{0,200}specs\/\*\*/,
    'authorized non-clean read set names proposal and specs');
  assert.match(coordinator, /(?:never|not|shall not|do not)[\s\S]{0,120}(?:write|repair|edit)[\s\S]{0,200}(?:proposal|spec|artifact)/i,
    'spec coordinator never repairs artifacts');
  assert.match(coordinator, /(?:clean[\s\S]{0,120}(?:not|never|do not)[\s\S]{0,80}read|artifact[- ]blind|do not[\s\S]{0,80}read[\s\S]{0,80}artifact)/i,
    'clean route stays blind');
  assert.match(coordinator, /non[- ]clean[\s\S]{0,300}(?:inspect|read)/i,
    'non-clean route may inspect');
  assert.match(coordinator, /continue_after_recovery|same[- ]worker/i,
    'in-scope correction is same-worker recovery');
```

- [x] Verify RED: `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: failures on the new/widened pins against current cards.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase

- [x] Edit `sai/commands/spec/coordinator.md`:

  1. Declare `recovery_policy: true` on the spec phase adapter (static, dispatch-time).
  2. Declare the worker-owned / authorized non-clean read set: `proposal.md`, `specs/**`, and permitted root `GLOSSARY.md`.
  3. Declare same-worker correction; zero write/repair authority on those paths.
  4. Qualify the blanket artifact-read ban: **clean route** (progress, needs_input, completed without non-clean trigger, cancelled) stays blind — do not read change artifacts.
  5. **Non-clean route only** (post-resolution `failed`, coordinator-disproved `completed`, or `completed` with STOP): MAY read only the declared surface to establish cause, apply coordinator-verification tiebreak, and select shared recovery. Never write or repair; forward ordered diagnosis via `continue_after_recovery`.
  6. Preserve six-step progress plan, feedback gate, changed-file union, mandatory stop. Diagnosis is conversation text only — never progress evidence; non-clean reads do not mark/reconcile progress steps.
  7. Do **not** restate shared ledger/budget rules — reference shared runner ownership.

- [x] Edit `sai/commands/design/coordinator.md`:

  1. Keep `recovery_policy: true` and existing overview-generation recovery path.
  2. Qualify **Design phase adapter** / no-I/O language for the **clean route** only: no prerequisites, no OpenSpec, no git/code/config/docs, no design-artifact reads, no writes, no technical design decisions.
  3. Add a narrow **non-clean** exception: after resolution, for `failed` / coordinator-disproved `completed` / `completed` with STOP, MAY inspect only `design.md`, `tasks.md`, `interfaces.md`, plus read-only `proposal.md` / `specs/**` solely to name prior-phase out-of-scope causes.
  4. Never write artifacts (including overview and `.openspec.yaml`) for diagnosis; same-worker correction only; out-of-scope / unresolved → zero slots and hand-back.
  5. Main-path recovery MUST NOT early-dispatch overview generation or create a second overview loop. Overview recovery remains the phase-static `design-overview-repair` channel.
  6. Replace absolute "Forward every worker payload without inspecting artifacts" recovery wording so it applies to the **clean route** / overview path as appropriate, while non-clean main-path inspection is explicitly allowed under the exception.
  7. Preserve feedback gate, progress plan, notices, and completion-sentence boundary.

- [x] Preserve sole overview registry exclusivity tests (`Step 6 compatibility keeps diagnosis-driven recovery...`) — design coordinator must still NOT contain a `| design-overview-repair |` table.

- [x] Verify GREEN: `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: PASS.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — coordinator suite fails on new clean/non-clean pins
- [x] GREEN verified — `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` passes
- [x] Spec and design both declare `recovery_policy: true`
- [x] Design coordinator still has no registry table row for `design-overview-repair`

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Planning worker classification and recovery continuation

*(Testable step — RED → GREEN.)*

##### RED phase

- [x] Add pins to `test/spec-coordinator-worker.test.js`:

```js
test('spec worker classifies post-resolution failures and owns recovery continuation', () => {
  const worker = artifact('sai/commands/spec/worker.md');
  assert.match(worker, /failure_class/,
    'spec worker must name failure_class');
  assert.match(worker, /unrecoverable/,
    'spec worker must name unrecoverable');
  assert.match(worker, /continue_after_recovery/,
    'spec worker must handle continue_after_recovery');
  assert.match(worker, /(?:validation-failed|generation-error)/,
    'spec worker must map validation/generation failures specifically');
  assert.match(worker, /proposal\.md[\s\S]{0,200}specs/,
    'authorized repair surface remains proposal/specs');
  assert.doesNotMatch(worker, /artifact_contents/);
  assert.match(worker, /(?:no|not|never)[\s\S]{0,120}(?:recovery progress|progress id).*recovery|recovery[\s\S]{0,200}(?:not|never)[\s\S]{0,120}progress/i,
    'recovery must not add progress step ids');
});
```

- [x] Add pins to `test/design-coordinator-worker.test.js`:

```js
test('design worker classifies main-path failures and recovery without collapsing overview envelope violations', () => {
  const worker = artifact('sai/commands/design/worker.md');
  assert.match(worker, /failure_class/);
  assert.match(worker, /unrecoverable/);
  assert.match(worker, /continue_after_recovery/);
  assert.match(worker, /design\.md[\s\S]{0,120}tasks\.md[\s\S]{0,120}interfaces\.md/);
  assert.match(worker, /blocking-contradiction[\s\S]{0,300}(?:proposal|specs)/i,
    'prior-phase contradiction maps to blocking-contradiction');
  assert.match(worker, /envelope-contract-violation[\s\S]{0,200}(?:not|never)[\s\S]{0,120}generation-error|never[\s\S]{0,80}collapse[\s\S]{0,120}generation-error/i,
    'overview envelope-contract-violation must not collapse to generation-error');
  assert.match(worker, /(?:not|never|shall not)[\s\S]{0,120}(?:edit|write|repair)[\s\S]{0,200}(?:proposal\.md|specs\/\*\*)/i,
    'recovery must not edit proposal/specs');
});
```

- [x] Keep `overview recovery re-dispatches eligible failures...` green; widen only if adjacent main-path prose breaks its regex windows.

- [x] Verify RED: `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/bounded-worker-recovery.test.js` — expected: new pins fail.

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase

- [x] Edit `sai/commands/spec/worker.md`:

  1. Replace generic "failed for blockers" / unguided blocker language with the shared closed `failure_class` rule for every post-resolution `failed` result, plus boolean `unrecoverable` and concrete non-raw evidence in `summary`.
  2. Map: generation failures → `generation-error` (unless a more specific class applies); validation / consistency / scenario failures → `validation-failed`; unsafe continuation requiring forbidden artifacts → `unrecoverable: true` with applicable class.
  3. Authorized write surface remains `proposal.md`, `specs/**`, permitted root `GLOSSARY.md` only.
  4. On `continue_after_recovery`: apply only the coordinator's ordered diagnosis; re-run existing spec verification; return `completed` only after verification. Coordinator writes nothing.
  5. Do not emit recovery progress ids; do not persist recovery counters/metadata into artifacts.
  6. Preserve progress plan, external findings consumption, feedback, and terminal payload rules.

- [x] Edit `sai/commands/design/worker.md`:

  1. Keep existing post-resolution `failure_class` / `unrecoverable` / overview five-field mapping.
  2. Make **main-path** classification explicit for `design.md` / `tasks.md` / `interfaces.md` failures (`validation-failed` with evidence; contradictory proposal/specs → `blocking-contradiction` with dependency evidence — repair still out of surface).
  3. Ensure overview `envelope-contract-violation` MUST NOT collapse into `generation-error`.
  4. On `continue_after_recovery`: repair only authorized main design trio and/or existing overview surface; re-verify before `completed`; never edit proposal/specs for diagnosis repair; no second overview regeneration allowance beyond existing bounded overview recovery.
  5. Suppress success completion sentence on failed recovery per existing design failure boundary (coordinator-side; worker must not claim completed overview/main path when verification fails).
  6. Preserve progress plan, feedback, overview lifecycle, and ordinary replacement fallback outside recovery.

- [x] Verify GREEN: `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/bounded-worker-recovery.test.js` — expected: PASS.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — worker classification pins fail pre-GREEN
- [x] GREEN verified — triple-file focused suite passes
- [x] Overview recovery re-dispatch cases still pass
- [x] No `artifact_contents` field introduced on either worker

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 5: Full-suite confirmation and cross-cutting pins

*(Testable step — RED → GREEN. Additive pins only — no deferred Step 1–4 repairs.)*

##### RED phase

- [x] Add cross-cutting cases (prefer one combined test per suite file, or a single new test in `test/bounded-worker-recovery.test.js` that reads both coordinator cards):

```js
test('planning clean path stays blind while non-clean path names class artifact and cause locus', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  const specCoord = artifact('sai/commands/spec/coordinator.md');
  const designCoord = artifact('sai/commands/design/coordinator.md');
  const contract = `${runner}\n${specCoord}\n${designCoord}`;

  assert.match(specCoord, /(?:clean|happy path|progress|needs_input)[\s\S]{0,300}(?:not|never|do not)[\s\S]{0,120}(?:read|open|inspect)[\s\S]{0,120}artifact/i,
    'spec clean path never opens artifacts');
  assert.match(designCoord, /(?:clean)[\s\S]{0,300}(?:not|never|do not|shall not)[\s\S]{0,120}(?:read|inspect)[\s\S]{0,120}artifact/i,
    'design clean path never opens artifacts');
  assert.match(specCoord, /non[- ]clean[\s\S]{0,400}(?:failure_class|class)[\s\S]{0,400}(?:artifact|cause locus|Cause Locus)/i,
    'spec non-clean diagnosis names class/artifact/locus when evidence permits');
  assert.match(designCoord, /non[- ]clean[\s\S]{0,400}(?:failure_class|class)[\s\S]{0,400}(?:artifact|cause locus|Cause Locus)/i,
    'design non-clean diagnosis names class/artifact/locus when evidence permits');
  assert.match(contract, /(?:never|not|shall not)[\s\S]{0,120}(?:write|repair)[\s\S]{0,200}(?:proposal|design\.md|artifact)/i,
    'planning coordinators never become artifact writers');
  assert.equal((runner.match(/\| design-overview-repair \|/g) || []).length, 1,
    'sole design-overview-repair registry row');
});
```

If harness-parity smoke is not already covered by existing Claude/opencode binding tests in the two coordinator suites, add a light pin that both harness bindings still fetch the same neutral worker contracts (existing binding tests often already cover this — do not duplicate).

- [x] Verify RED: `node --test test/bounded-worker-recovery.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: new cross-cutting pin fails until coordinator prose already added in Steps 3–4 is complete. If Steps 3–4 already satisfy the pin, RED may pass immediately — still run it; if it passes, skip GREEN prose edits and only keep the additive test.

- [x] **GATE — If RED fails because Step 3–4 prose is incomplete, STOP and repair those steps first (do not paper over with Step 5). If RED fails only because the pin is new and prose is already correct, proceed to GREEN by landing the test only.**

##### GREEN phase

- [x] Land the additive cross-cutting test(s). Do **not** rewrite Steps 1–4 contracts here unless a tiny wording widen is required for a legitimate phrase the pin already expects from Steps 3–4.
- [x] Do **not** edit baseline `openspec/specs/**`.
- [x] Do **not** edit Explore or Build command cards.
- [x] Verify focused: `node --test test/bounded-worker-recovery.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` — expected: PASS.
- [x] Verify full: `npm test` — expected: PASS relative to the pre-existing suite baseline. Ignore only failures documented in `SAI_LEARNINGS.md` as pre-existing and unrelated (e.g. missing idea-list-render bindings). Any new failure in the three focused files or in files this change touched is a hard fail — fix before commit.

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [x] Focused triple-file suite passes
- [x] `npm test` introduces no new failures attributable to this change
- [x] No baseline `openspec/specs/**` edits
- [x] No Explore/Build card edits
- [x] Exactly one `| design-overview-repair |` row remains in the runner
- [x] ADR 0166 exists at `docs/adr/0166-per-cause-surface-dual-channel-exclusivity.md` (created during implement planning) and is indexed in `docs/adr/0000-INDEX.md`

**Human (read-through smoke after automated checks — Manual Verification from design.md):**
- [x] Open `sai/orchestration/command-runner.md` Bounded Recovery and confirm planning non-clean triggers, dual-channel exclusivity, and adapter surface declaration language are present once and not restated on phase cards
- [x] Confirm `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` still prohibit artifact reads on clean completed / progress / notice / needs_input paths
- [x] Confirm exactly one phase-static registry row (`design-overview-repair`) remains in the runner and design coordinator does not inspect `change-overview.md` for main-path diagnosis

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks above (read-through smoke), then stage and commit before continuing.

## Notes for apply

- **ADR already created:** `docs/adr/0166-per-cause-surface-dual-channel-exclusivity.md` and its warm index splice were written during `/sai-3-implement` Step 3. Apply does not recreate them; Step 5 only verifies presence.
- **Baseline specs:** All normative deltas live under `openspec/changes/diagnosis-driven-recovery-spec-design/specs/**`. Do not treat active `openspec/specs/**` as this change's source of truth and do not rewrite historical baseline assertions to target those baselines as if they were the delta.
- **Co-location rule (D7):** Each step lands contract prose with the assertions that pin it. Step 5 is confirmation only.
- **Out of scope:** Explore Auto diagnosis-round; Build card edits; durable recovery ledgers in artifacts; replacement-worker dispatch from recovery; class-based eligibility.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | red | red | 1 | assertion | The two new planning and exclusivity pins failed as intended. |
| 1 | green | green | 3 | assertion | Corrected the contract wording within the authorized runner file. |
| 2 | red | red | 1 | assertion | The worker-core lifecycle-only pin failed as intended. |
| 2 | green | green | 1 | n/a | Worker-core clarification passed the focused suite. |
| 3 | red | red | 1 | assertion | Coordinator clean/non-clean boundary pins failed as intended. |
| 3 | green | green | 1 | assertion | Coordinator contract wording was corrected within authorized files. |
| 4 | red | red | 1 | assertion | Worker classification and continuation pins failed as intended. |
| 4 | green | green | 1 | n/a | Both planning workers passed the triple-file focused suite. |
| 5 | red | red | 1 | assertion | The cross-cutting pin failed before the Step 3 wording correction. |
| 5 | green-exception | green | 1 | assertion | Focused verification passed after the bounded Step 3 wording correction. |

)
