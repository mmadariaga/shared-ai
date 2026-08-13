
# {FEATURE_NAME}

## Goal

{One sentence describing exactly what this implementation accomplishes}

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

- [ ] Create a minimal stub at `{file}` so the test can compile:

```{language}
{MINIMAL STUB — exposes the symbol but returns null/wrong value}
```

- [ ] Write the test into `{test-file}`:

When `interfaces.md` exists for this change, list the step's scenarios at a high level only — concrete expected-value assertions are single-sourced in `interfaces.md` and are not restated here.

When `interfaces.md` is absent, sai-4-apply will expand the scenario descriptions into full test assertions during RED.

- {Scenario A description}
- {Scenario B description}

- [ ] Verify RED: run `{test-command}` — expected: **assertion failure** (exit ≠ 0 AND failure attributable to behaviour under test, NOT a setup/import/compilation error).
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure, STOP and report to the user per the RED → GREEN handling rules in the implementation instructions. Do not paste the GREEN code below.

##### GREEN phase (only after RED is verified)

- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

- [ ] Verify GREEN: run `{test-command}` — expected: PASS

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — `{test-command}` fails as expected
- [ ] GREEN verified — `{test-command}` passes
- [ ] `{command}` — {expected result}

**Human (verify in browser before committing):**
- [ ] {Specific observable behavior in the browser}

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks in the browser, then stage and commit before continuing.

#### Step 2: {Action — creates component not yet integrated into any page}

*(Non-testable step — standard format, no RED/GREEN needed because component is not yet rendered)*

- [ ] {Specific Instruction 1}
- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

*(No Human checks — component not yet rendered in the app. Browser verifications deferred to Step N where it is first integrated.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: {Action — service-side / non-UI step with no observable browser behavior}

*(Service-side / non-UI step — standard format. No human check anywhere because nothing is rendered for a human to observe. Distinct from Step 2, whose checks are deferred, not absent.)*

- [ ] {Specific Instruction 1}
- [ ] Copy and paste code below into `{file}`:

```{language}
{COMPLETE, TESTED CODE - NO PLACEHOLDERS - NO "TODO" COMMENTS}
```

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

*(No Human checks — service-side step with no observable browser behavior. Unlike Step 2 these checks are not deferred; there is no human check for this step anywhere. Never substitute a `- [ ] No human check required` checkbox.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step N: {Integration step — first step where deferred components are rendered}

- [ ] {Specific Instruction 1}

##### Step N Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `{command}` — {expected result}

**Human (verify in browser before committing):**

*Deferred from Step 2 ({Component name}):*
- [ ] {Browser behavior deferred from Step 2}
- [ ] {Browser behavior deferred from Step 2}

*Step N:*
- [ ] {Browser behavior specific to this integration step}

#### Step N STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks above (including all deferred ones) in the browser, then stage and commit before continuing.

