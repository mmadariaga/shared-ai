# sai-build-command

## Goal

Ship `/sai-build` as a routed two-phase composition coordinator (implement→apply), parameterize implement `terminal_navigation` for non-final composition, and register the command across boots, wrappers, launchers, skill registry, docs, and inventory tests.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "sai-build-command"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Parameterize implement terminal_navigation

*(Testable step — RED → GREEN)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here. If a stub is needed to compile, make it return the wrong value so the test still fails with an assertion error.

- [x] Extend `test/implement-coordinator-worker.test.js` with dual-path terminal_navigation assertions (scenarios at high level; concrete pins single-sourced in `interfaces.md` Step 1):
  - Standalone/sole/final binding still contains the pinned completion guidance to run `/sai-4-apply {name}` in a new chat
  - Non-final composition binding: on worker `completed`, communicate summary + changed files, invoke only authorized composition transition, and MUST NOT print the standalone `/sai-4-apply` invitation
  - Failed/cancelled never fire standalone completion or composition transition
  - Existing sole/final literal pins remain green when the sole/final binding is present

- [x] Extend `test/implementation-completion-step-4.test.js` so dual-path expectations keep the standalone completion pin for sole/final while allowing positional non-final language on the coordinator

- [x] If `test/apply-routed-architecture.test.js` pins implement adapter field parity with apply, extend those pins so implement `terminal_navigation` is described as positional (sole/final vs non-final) matching apply's pattern

- [x] Verify RED: run `node --test test/implement-coordinator-worker.test.js test/implementation-completion-step-4.test.js test/apply-routed-architecture.test.js` — expected: **assertion failure** (exit ≠ 0 AND failure attributable to missing positional terminal_navigation language / dual-path pins, NOT a setup/import/compilation error).

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure, STOP and report to the user. Do not paste the GREEN code below.

##### GREEN phase (only after RED is verified)

- [x] Edit `sai/commands/implement/coordinator.md` so the implementation phase adapter's `terminal_navigation` field is parameterized positionally, matching apply's pattern in `sai/commands/apply/coordinator.md`. Replace the single always-on completion sentence with a bound two-action field.

Concrete replacement for the adapter field bullet currently reading roughly `` `terminal_navigation`: implementation completion or unsuccessful-stop behavior `` — use exactly this shape (wording may be tightened for style but MUST preserve the three position cases and the pinned standalone literal):

```markdown
  - `terminal_navigation` — parameterized binding over two terminal actions; selection is positional:
    - sole adapter (direct `/sai-3-implement`) → shell-owned standalone completion action (exact pinned literal + stop)
    - final adapter in a multi-adapter sequence → same shell-owned standalone completion action
    - non-final adapter → composition-owned authorized transition only (do not print the standalone MANDATORY STOP message)
    Completion gates that decide whether the phase may finish remain unchanged; only which bound action runs after those gates succeed is parameterized.
```

- [x] Replace the Result-loop `On \`completed\`` paragraph so it invokes the bound `terminal_navigation` action instead of always printing the standalone literal. Keep failed/cancelled paths free of both the standalone completion message and any composition transition. The sole/final standalone completion action MUST still print exactly:

```text
Implementation plan done in openspec/changes/{name}/. Review and run `/sai-4-apply {name}` (--fast-track) **in a new chat** when ready.
```

Use this Result-loop structure (adapt surrounding prose only if required for grammar; keep status handling and changed-file union language intact):

```markdown
  On `failed`, print the blocking summary and accumulated changed-file list, then stop without the completion message and without a composition transition. On `cancelled`, print the clean-stop summary and accumulated changed-file list, then stop without claiming completion and without a composition transition. On `completed`, print the concise summary and accumulated changed-file list, then invoke the bound `terminal_navigation` action:
  - sole or final implement → print exactly: `Implementation plan done in openspec/changes/{name}/. Review and run \`/sai-4-apply {name}\` (--fast-track) **in a new chat** when ready.` Stop immediately.
  - non-final chained implement → invoke only the composition-owned authorized transition to the consecutive successor; do not print the standalone MANDATORY STOP message.
```

- [x] Do NOT move the completion string into `sai/commands/implement/invocation.md` (it owns no terminal message).
- [x] Do NOT change worker.md, invocation.md load order, or progress-plan ids.
- [x] Align the dual-path test expectations written in RED with the new coordinator prose so sole/final pins still use `coordinator.includes(...)` on the exact standalone literal (with the same backtick escaping the existing tests use).
- [x] Verify GREEN: run `node --test test/implement-coordinator-worker.test.js test/implementation-completion-step-4.test.js test/apply-routed-architecture.test.js` — expected: PASS

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — scoped node tests fail as expected before GREEN
- [x] GREEN verified — same scoped tests pass
- [x] `node --test test/implement-coordinator-worker.test.js test/implementation-completion-step-4.test.js test/apply-routed-architecture.test.js` — exit 0
- [x] Coordinator still contains the exact standalone completion literal for sole/final binding
- [x] Coordinator contains non-final / composition transition language and does not always-print the standalone literal unconditionally after every `completed`
- [x] Failed/cancelled paths still forbid the completion message and composition transition

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | red | red | 2 | assertion | Corrected wording to preserve the existing standalone completion pin. |
| 1 | green | green | 2 | assertion | Final scoped verification passed. |
| 2 | red | red | 3 | assertion | Final RED run isolated assertion failures after an initial missing-file setup failure. |
| 2 | green | green | 3 | assertion | Build-specific checks passed; global wrapper checks were deferred to Step 3. |
| 2 | green | green | 1 | validation-failed | Recovery found no safe in-scope correction for deferred Step 3 inventory failures. |
| 2 | green | green | 1 | validation-failed | Recovery rechecked the same out-of-scope inventory failures. |
| 2 | green | green | 1 | validation-failed | Recovery exhausted after three attempts; Step 2 boundary was corrected before resuming. |

#### Step 2: Author build coordinator and launcher cards

*(Testable step — RED → GREEN)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports.

- [x] Create `test/build-coordinator.test.js` that asserts the build coordinator/launcher prose contracts (high-level scenarios; pins from `interfaces.md` Step 2 / `specs/sai-build-command` / registration / launcher-card / fast-track deltas):
  - Adapter order implement at 0, apply at 1; shared runner order language
  - Single change resolution; no second picker on apply activation
  - Implement envelope `{wrapper_echo_value:"", arguments_value:"{name}"}`
  - Apply envelope `command_name: apply`, empty echo, resolved `arguments_value`, absent/empty continuation; fast-track as session state not envelope key
  - Pre-resolution `--fast-track` strip in any token order; not a fifth parse member; no build-local fast-track state
  - No intermediate approval/feedback gate; successful phase 1 transitions without standalone implement completion
  - Banner `> FAST-TRACK MODE ACTIVE` once at apply activation; zero when apply never starts
  - Phase-1 `failed`/`cancelled` blocks apply; no RED/GREEN dispatch after phase-1 failure
  - Position 1 names existing apply adapter path (`sai/commands/apply/coordinator.md` / chained activation)
  - Launcher fetches only implementation-worker binding + build coordinator; no `red-worker` / `green-worker`
  - Injected fast-track semantics: commit pre-auth, non-detached branch auto-stay, deferred combined HV as post-commit report, detached-HEAD three-option branch prompt retained, safe-operations still required
  - No Step-count ceiling language (large plans accepted)
  - Final completion text is apply's pin: `Implementation applied. Run `/sai-5-review {name}` in a new chat when ready.`
  - Changed-files union across segments; re-entry via implement collapse; non-removable stops preserved
  - No `sai/commands/build/worker.md`; no explore supervision / Auto crystallization language
  - Explore supervision pattern is not used (disk-backed change-picker)

- [x] Update `test/command-launcher-card.test.js` inventory expectations so the in-scope launcher set admits `build` (15 → 16 launchers) and `build` is NOT in `emptyLaunchers`; add `build` movedDirectives matching implement's two-fetch shape

- [x] Update `test/orchestration-source-layout-step-2.test.js` if it enumerates phase/card directories so `sai/commands/build/` is listed with `coordinator.md` and `launcher.md` only (no `worker.md`)

- [x] Verify RED: run `node --test test/build-coordinator.test.js test/command-launcher-card.test.js test/orchestration-source-layout-step-2.test.js` — expected: **assertion failure** (missing build cards / inventory counts).

- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [x] Create directory `sai/commands/build/` (no `worker.md`, no `instructions.md` required for this change).

- [x] Create `sai/commands/build/launcher.md` with exactly these two Fetch lines (mirror implement launcher; harness-neutral; no red/green bindings):

```markdown
Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.
Fetch @sai/commands/build/coordinator.md and follow those instructions exactly.
```

- [x] Create `sai/commands/build/coordinator.md` as the sole routed entry. It MUST open with Isolation Mode + `<TASK>` like other coordinators, load the shared runner and worker-core, and declare the composition supervisor contract. Use the following body as the authoritative content (keep Isolation Mode preamble identical to other coordinators):

```markdown
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/orchestration/command-runner.md and follow it exactly.
  Fetch @sai/orchestration/worker-core.md and follow it exactly.

  ## Build composition coordinator
  You are the user-facing `/sai-build` composition supervisor. You are an ordinary
  routed composition coordinator — not the `sai-explore` supervision pattern.
  Resolve the change from disk-backed change-picker / envelope inputs. Do not hold
  dispatch state in conversation text. Do not require Auto crystallization
  authorization. Do not introduce a new orchestration file or relocate
  `sai/orchestration/command-runner.md`.

  Declare an ordered sequence of exactly two phase adapters and execute them
  strictly in list order through the shared Result Loop:
  - position 0 — implementation phase adapter (`sai/commands/implement/coordinator.md`)
  - position 1 — existing apply phase adapter (`sai/commands/apply/coordinator.md`
    chained-activation path from `apply-phase-adapter-extraction`)

  Position 1 is the existing apply adapter. Build does not re-declare RED/GREEN
  dispatch. After position 1 activates, the apply adapter remains the sole owner
  of `sai-4-red-worker` / `sai-4-green-worker` selection. Build does not introduce
  a build-specific managed worker, worker binding, or worker matrix entry.

  ## Pre-resolution envelope normalization
  Before change resolution, strip every `--fast-track` token from the selected
  envelope source (trimmed non-empty `wrapper_echo_value`, otherwise
  `arguments_value`) in any token order. The cleaned remainder is the change-name
  input to the standard change-consuming resolution order. Stripping does NOT
  make `/sai-build` a fifth body-file parse member, does NOT activate a
  build-local fast-track mode, and does NOT write session state from the token.
  Explicit `--fast-track` on `/sai-build` is a behavioral no-op for phase order,
  injection, and gates.

  ## Single change resolution
  Resolve the target OpenSpec change name exactly once at the start of the
  invocation using the established change-consuming resolution order (trimmed
  non-empty wrapper echo before arguments, then the zero/one/multiple picker when
  both are empty). Retain the resolved name as supervisor-owned invocation state.
  Neither segment re-enters a harness boot adapter or command wrapper. After a
  successful phase 1, the apply segment does not re-run change-picker or
  prerequisite checks that implement already satisfied for `implementation.md`
  existence.

  Build does not add a separate design-approval or artifact-preflight gate beyond
  the prerequisites and artifact checks the implement segment already owns. An
  unapproved or incomplete design fails or blocks inside implement the same way
  direct `/sai-3-implement` would.

  ## Composition-minted segment envelopes
  After resolution of `{name}`:

  - **Implement envelope** (original two-field worker envelope):
    `{wrapper_echo_value: "", arguments_value: "{name}"}`
  - **Apply envelope** (composition-built chained-apply shape):
    `command_name: apply` (shape compatibility only — not boot/card selection),
    `wrapper_echo_value: ""`,
    `arguments_value: "{name}"`,
    `continuation_reference` absent or empty at segment start.
    Normalized fast-track boolean **true** is supervisor session state injected
    alongside the envelope, not an additional required envelope key.

  ## No intermediate approval gate
  A successful implement segment transitions immediately to the apply segment.
  Do not stop for artifact feedback, plan review, or user approval between the
  two phases. Plan quality remains the implement worker's validation step.
  Do not extend the Review Engine artifact vocabulary for `implementation.md`.

  ## Non-final implement terminal navigation
  When implement runs as position 0 (non-final), its positional
  `terminal_navigation` resolves to the composition-owned authorized transition
  only. Communicate the implement summary and changed-files union as required by
  the shared runner. Do NOT print the standalone implement completion literal:

  `Implementation plan done in openspec/changes/{name}/. Review and run `/sai-4-apply {name}` (--fast-track) **in a new chat** when ready.`

  ## Unconditional apply fast-track and banner ownership
  When activating the apply segment, always inject fast-track true. Because
  chained apply skips the standalone shell parse, this supervising coordinator
  owns banner emission: print exactly one line `> FAST-TRACK MODE ACTIVE` exactly
  once at apply-segment activation, as ordinary in-conversation text, and write
  nothing to disk to record it. Print the banner zero times when apply never
  activates. Apply's skipped shell must not print a second banner.

  Injected fast-track still means: commit pre-authorization, non-detached branch
  auto-stay, and deferred combined Human Verification as a post-commit report
  after Final sweep (not an approval gate). Detached HEAD still presents the
  existing three-option branch prompt. Safe-operations confirmations remain
  required — never auto-approve them because fast-track is injected.

  ## Phase-1 failure blocks apply
  If the implement segment returns `failed` or `cancelled`, close the invocation
  without activating apply, without printing the FAST-TRACK banner, and without
  claiming apply completion. Report the failure or clean-stop summary and the
  accumulated changed-files union.

  ## Re-entry
  Re-entry after interruption or partial apply goes through the implement segment
  again, including implement Step 1b collapse (COMPLETO / FALLO MENOR /
  INCOMPLETO). Never resume the apply loop directly while skipping implement
  re-planning. On-disk `implementation.md` checkbox state remains the recovery
  record.

  ## Non-removable stops
  Do not suppress apply's non-removable stops: routing-tree STOP, GREEN-conflict
  STOP, recovery-pool exhaustion after three same-GREEN-worker attempts, and
  every safe-operations confirmation. Incomplete apply (pending checkboxes,
  pending non-deferred HV outside fast-track deferral, or pending commits) closes
  without the successful final completion transition.

  ## Final terminal navigation
  When apply is the final segment and all apply completion conditions pass, use
  apply's final `terminal_navigation` action: print exactly

  `Implementation applied. Run `/sai-5-review {name}` in a new chat when ready.`

  then stop. Do not invent a distinct build-only success message that replaces
  that pinned apply completion text. Do not chain further phases.

  ## No Step ceiling
  Do not declare a maximum Step count. Large plans are accepted. Context-budget
  pressure is mitigated by re-entry after interruption, not by a hard Step cap.

  ## Changed-files union
  Preserve one ordered, duplicate-free changed-files union across the
  implement→apply transition. Progress events and terminal payloads from either
  segment add paths in first-seen order without resetting the union on segment
  activation.

  ## Workers
  Phase 1 dispatches the existing `sai-3-implementation-worker`. Phase 2
  dispatches existing `sai-4-red-worker` / `sai-4-green-worker` only through the
  apply adapter. RED remains blind to the GREEN implementation body in the split
  flow. GREEN retains its absolute test-file prohibition.

</TASK>

Follow instruction on <TASK> step by step
```

- [x] Update `test/command-launcher-card.test.js`:
  - Add `['sai-build.md', 'build']` to the `commands` array (alphabetically with other un-numbered entries is fine; keep stable with other tests — place after `sai-backfill` / before `sai-commit` or matching the 16-name list order used by thin-wrappers: after `sai-backfill`)
  - Keep `emptyLaunchers` as the seven near-empty only — do **not** add `build`
  - Add `build` to `movedDirectives`:

```javascript
  build: [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
    'Fetch @sai/commands/build/coordinator.md and follow those instructions exactly.',
  ],
```

  - Change launcher-count assertions from 15 → 16 (test title and `assert.equal(actual.length, 16)`)
  - Change source wrapper directory count from 16 → 17 (includes `budget.md` + 16 `sai-*.md`)
  - Add opencode label for build if required: `'sai-build.md': '**Change-name argument:** $ARGUMENTS'` (or with optional flags note — build strips `--fast-track` itself; prefer `**Change-name argument:** $ARGUMENTS` matching implement, since `--fast-track` is a no-op)
  - Update `fixtures/thin-command-wrappers-baseline.json` so both harnesses include `sai-build.md` baseline fetch sets matching wrapper+launcher union (harness fetch + boot + implementation-worker binding + no inline phase logic). Recompute by reading the new wrappers after Step 3 if baseline is regenerated then — for this step, add a provisional baseline entry that matches launcher-only union until wrappers land; if the baseline test fails until Step 3 wrappers exist, land the baseline update in the same commit as Step 3 wrappers instead (do not leave the suite red across commits).

- [x] Update orchestration source-layout inventory tests as needed so `sai/commands/build/coordinator.md` and `launcher.md` are expected present and `worker.md` is absent.

- [x] Verify GREEN: run `node --test --test-name-pattern "build|exactly 16 harness-neutral launcher cards" test/build-coordinator.test.js test/command-launcher-card.test.js test/orchestration-source-layout-step-2.test.js` — expected: PASS (global wrapper and baseline assertions remain Step 3 scope until both wrappers exist).

**Commit-boundary rule:** If `command-launcher-card` wrapper-directory count cannot go green until wrappers exist, split the inventory assertions: Step 2 greens launcher-card existence + build movedDirectives + build-coordinator suite; Step 3 greens wrapper directory count 17 and baseline fixture. Document which assertions moved in the Step 2 commit message.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — scoped tests fail before cards exist
- [x] GREEN verified — `test/build-coordinator.test.js` passes
- [x] `sai/commands/build/coordinator.md` and `launcher.md` exist; `worker.md` does not
- [x] Launcher has exactly the two Fetch lines above and no `claude`/`opencode` tokens
- [x] Coordinator declares implement→apply order, envelopes, banner ownership, failure blocking, re-entry, non-removable stops, apply final completion, changed-files union, no Step ceiling

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Register boot adapters and mirrored thin wrappers

*(Testable step — RED → GREEN)*

##### RED phase

- [ ] Extend inventory/install/doctor tests so they expect `build` on both boots and `sai-build.md` on both harnesses (15→16 `sai-*.md` wrappers; source dirs 16→17 including `budget`):
  - `test/command-launcher-card.test.js` (remaining wrapper-directory / baseline pieces deferred from Step 2)
  - `test/doctor-fetch-resolution.test.js` — installed launcher/boot resolution includes build paths
  - `test/doctor-harness-inventory.test.js` — harness card/wrapper inventories admit build
  - `test/install-claude.test.js` / `test/install-opencode.test.js` — projection assertions list `sai-build.md` / build cards
  - `test/apply-routed-architecture.test.js` — if boot routed-name list is pinned, include `build` while keeping existing routed + utility names
  - `test/model-customization-menu.test.js` — `OPENCODE_COMMANDS` (and any mirrored 16-name fixture) becomes 17 names including `sai-build` and `budget` (design D10)

- [ ] Verify RED: run `node --test test/command-launcher-card.test.js test/doctor-fetch-resolution.test.js test/doctor-harness-inventory.test.js test/install-claude.test.js test/install-opencode.test.js test/apply-routed-architecture.test.js test/model-customization-menu.test.js` — expected: **assertion failure** on missing build registration.

- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] Edit `sai/adapters/claude/boot.md` routed-name list to include `build`. Keep all existing routed names (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `apply`) and utility names (`archive`, `backfill`, `commit`, `explore`, `pr`, `status`, `worktree`). Example target wording:

```markdown
Use `command_name` only for card selection. Routed names (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `apply`, `build`) select the matching coordinator card — `@sai/commands/{name}/coordinator.md`, for example `Fetch @sai/commands/spec/coordinator.md`, `Fetch @sai/commands/apply/coordinator.md`, and `Fetch @sai/commands/build/coordinator.md`. Utility names (`archive`, `backfill`, `commit`, `explore`, `pr`, `status`, `worktree`) select the matching utility body card — `@sai/commands/{name}/body.md`, for example `Fetch @sai/commands/archive/body.md`.
```

- [ ] Mirror the same routed-name update in `sai/adapters/opencode/boot.md`.

- [ ] Create `commands/claude/sai-build.md` (implement-tier frontmatter; thin three-directive skeleton; `command_name: build`):

```markdown
---
description: Run implementation planning and apply back-to-back for one OpenSpec change through the build composition coordinator.
argument-hint: "[change-name]"
model: opus
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/build/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: build
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
```

- [ ] Create `commands/opencode/sai-build.md` (mirror implement model tier + change-consumer echo):

```markdown
---
description: Run implementation planning and apply back-to-back for one OpenSpec change through the build composition coordinator.
model: opencode-go/deepseek-v4-flash
variant: max
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/build/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: build
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument:** $ARGUMENTS
```

- [ ] Do NOT add a `sai-build-worker` agent, binding, or worker-matrix row.
- [ ] Do NOT add a new install-manifest destination class — recursive `sai/commands` and wrapper projections already cover new files.
- [ ] Update inventory tests and `fixtures/thin-command-wrappers-baseline.json` so both harnesses include `sai-build.md` with the three-directive skeleton union (fetch skill + boot + implementation-worker binding from launcher).
- [ ] Update `OPENCODE_COMMANDS` / mirrored command-name fixtures from 16 → 17 to include `sai-build` (keep alphabetical or existing sort order used by the fixture).
- [ ] Verify GREEN: run the same scoped inventory suite as RED — expected: PASS
- [ ] Optionally run full `npm test` if scoped green.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — inventory tests fail before registration
- [ ] GREEN verified — scoped inventory/install/doctor tests pass
- [ ] Both boots list `build` among routed names and still list the full prior routed + utility sets
- [ ] `commands/claude/sai-build.md` and `commands/opencode/sai-build.md` exist with `command_name: build` and implement-tier models
- [ ] No `sai-build-worker` agent or binding file appears
- [ ] Wrapper directory file count is 17 per harness including `budget.md`

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Registry skill and operator documentation

*(Non-testable step — docs + skill table only)*

- [ ] Edit `skills/universal/sai-commands/SKILL.md` Command Registry table: add a row for `/sai-build` → `@commands/sai-build.md` with a one-line description that identifies chained implementation planning and apply. Place it with the other un-numbered commands (e.g. after `/sai-backfill` or near `/sai-commit`). Ensure the table covers the full 16-command `sai-*.md` set plus `budget`.

Suggested row:

```markdown
| `/sai-build` | `@commands/sai-build.md` | Build composition — runs implementation planning and apply back-to-back for one change with injected apply fast-track. |
```

- [ ] Edit `README.md` user-invoked command inventories / model tables so both harnesses document `/sai-build` (implement-tier coordinator models: Claude `opus`/low; opencode `opencode-go/deepseek-v4-flash`/`max`). Do not describe build as an internal `opsx:*` skill. When one harness is named, name both.

- [ ] Edit `AGENTS.md` similarly:
  - Main pipeline diagram / prose may note `/sai-build` as the short implement→apply composition path (optional short pipeline `explore → build → review`) without removing standalone `/sai-3-implement` and `/sai-4-apply`
  - Repo structure / routed cards line should admit `build` under routed cards (`coordinator.md` + `launcher.md`; no `worker.md`)
  - Critical conventions: add a short **Build coordinator** subsection stating Claude Code and opencode route `/sai-build` through the build composition card, reuse implement + RED/GREEN workers, inject apply fast-track, and end at apply's `/sai-5-review` completion
  - Change-picker list: add `sai-build` to the ten change-consuming commands (becomes eleven) with the same two-step precedence; placement note — build resolves change in the coordinator before phase 1
  - Prerequisite-dependent command list: include `sai-build` (openspec-dependent)
  - Fast-track section: note `/sai-build` is outside the four parse members; apply fast-track is composition-injected; banner once at apply activation

- [ ] Do not invent new registry-row snapshot tests unless a failing test requires it. If `test/install-manifest.test.js` fails on retired-name patterns after prose edits, fix only the tripping prose.

- [ ] Verify: run full `npm test` — expected: PASS
- [ ] Manually confirm skill table row and both docs mention `/sai-build` as a user-invoked command

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `npm test` — exit 0
- [ ] `skills/universal/sai-commands/SKILL.md` contains `/sai-build` → `@commands/sai-build.md` with chained implement-then-apply description
- [ ] `README.md` and `AGENTS.md` reference `/sai-build` and do not call it an `opsx:*` skill

**Human (operator smoke — documentation only):**
- [ ] Registration smoke: after install/projection, both harness command lists show `/sai-build`, boot routed-name lists include `build`, and `sai/commands/build/{coordinator,launcher}.md` resolve under the installed SAI root
- [ ] Standalone regression smoke: direct `/sai-3-implement` completion text still names `/sai-4-apply` in a new chat (automated tests own the pin; human confirms no accidental doc drift in README model tables)
- [ ] Composition happy-path mental walkthrough: `/sai-build {name}` → implement plan → FAST-TRACK banner at apply start → apply completion → `/sai-5-review {name}` prompt, with no mid-run plan approval gate

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify the Human checks above (registration smoke and mental walkthrough), then stage and commit before continuing.
