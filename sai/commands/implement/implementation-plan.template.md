# {FEATURE_NAME}

## Goal

{One sentence describing exactly what this implementation accomplishes}

## Verification commands

**Full-suite command:** `{full-suite-command}` — the complete repository test suite; `/sai-4-apply` runs it once, after the last Step commit.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "{feature-name}"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: {Action}

*(Testable step — use RED → GREEN)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here. If a stub is needed to compile, make it return the wrong value so the test still fails with an assertion error.
- **Retirements:** When this step replaces obsolete guard tests, list each retired test file ONLY inside this RED block — one entry per file with its exact repository-relative path marked `retired`. A step without a RED block never carries retirements. Each retirement adds one Verification Checklist item asserting the retired file's absence; the coordinator runs it after the RED dispatch returns and before GREEN may be dispatched.
- **Step test command:** `{step-test-command}` — selects only this Step's tests, with explicit paths, selectors, and arguments.

- [ ] Create a minimal stub at `{file}` so the test can compile:

```{language}
{MINIMAL STUB — exposes the symbol but returns null/wrong value}
```

- [ ] Write the test into `{test-file}`:

- {Scenario A description}
- {Scenario B description}

- [ ] Verify RED: run `{step-test-command}` — expected: **assertion failure** (exit ≠ 0 AND failure attributable to behaviour under test, NOT a setup/import/compilation error).
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure, STOP and report to the user. Do not paste the GREEN code below.

##### GREEN phase (only after RED is verified)

- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

- [ ] Verify GREEN: run `{step-test-command}` — expected: PASS

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — `{step-test-command}` failed by assertion during RED
- [ ] GREEN verified — `{step-test-command}` passes
- [ ] `{command}` — {expected result}

**Functional (verify by exercising the behavior in the browser):**
- [ ] {Specific observable behavior in the browser}

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. The Functional checks above are re-exercised by the terminal functional review at the end of the run; any it cannot verify is reported as pending human review.

#### Step 2: {Action — non-testable scaffolding for a component not yet integrated into any page}

*(Non-testable step — no testable logic, so the standard format without RED/GREEN. Its Functional checks are deferred because the component is not yet rendered.)*

- [ ] {Specific Instruction 1}
- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

*(No Functional checks — component not yet rendered in the app. Browser verifications deferred to Step N where it is first integrated.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: {Action — service-side / non-UI step with no observable browser behavior}

*(Service-side / non-UI step — standard format. No functional check anywhere because nothing is rendered to observe. Distinct from Step 2, whose checks are deferred, not absent.)*

- [ ] {Specific Instruction 1}
- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

*(No Functional checks — service-side step with no observable behavior. Unlike Step 2 these checks are not deferred; there is no functional check for this step anywhere. Never substitute a `- [ ] No functional check required` checkbox.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step N: {Integration step — first step where deferred components are rendered}

- [ ] {Specific Instruction 1}

##### Step N Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

**Functional (verify by exercising the behavior in the browser):**

*Deferred from Step 2 ({Component name}):*
- [ ] {Browser behavior deferred from Step 2}
- [ ] {Browser behavior deferred from Step 2}

*Step N:*
- [ ] {Browser behavior specific to this integration step}

#### Step N STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. The Functional checks above (including all deferred ones) are re-exercised by the terminal functional review at the end of the run; any it cannot verify is reported as pending human review.
