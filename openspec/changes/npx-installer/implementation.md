# npx-installer

## Goal

Add `package.json` and `bin/install.js` to enable one-command installation via `npx github:mmadariaga/shared-ai`, with an interactive terminal checklist for selecting Claude Code and/or Opencode as installation targets. Also fix skill copy semantics (all skills must use skip-if-exists, not overwrite), add `budget` skill to the Claude install map, and update README and install docs to reflect the npx installer as the official install method.

## Prerequisites

- Ensure branch is not `master` or `main`. Ask the user to select the branch to use:
  1. `npx-installer` (derived from the change name)
  2. Custom branch name (free input — e.g., a backlog-linked name)
- If the selected branch does not exist, create it from `main` before implementing.

---

### Step-by-Step Instructions

#### Step 1: Create package.json

*(already applied)*

---

#### Step 2: Scaffold bin/install.js — shebang, requires, constants, --help

*(already applied)*

---

#### Step 3: Implement interactive checklist UI

*(already applied)*

---

#### Step 4: Implement copy helpers

*(already applied)*

---

#### Step 5: Implement Claude file map

*(already applied)*

---

#### Step 6: Implement Opencode file map and conditional config copy

*(already applied)*

---

#### Step 7: Wire main orchestration and post-install reminder

*(Non-testable step — interactive orchestration; requires TTY)*

- [x] In `bin/install.js`, find the line `module.exports = {` and insert the following block immediately before it:

```js
async function main() {
  const choices = await promptChecklist(
    ['Claude Code', 'Opencode'],
    ['Opencode']
  );

  if (choices.length === 0) {
    console.log('Nothing selected. Exiting.');
    process.exit(0);
  }

  if (choices.includes('Claude Code')) {
    installClaude();
  }

  if (choices.includes('Opencode')) {
    installOpencode();
    copyOpencodeConfig();
  }

  console.log(
    "\nReminder: run 'openspec init --tools claude' (or --tools opencode) in each project,\nthen copy the openspec/schemas folder from this repo into the project root."
  );
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

```

##### Step 7 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node -e "const m=require('./bin/install.js');console.log(typeof m.installClaude, typeof m.installOpencode, typeof m.copyOpencodeConfig)"` — outputs `function function function`
- [x] `node --test test/copy-helpers.test.js` — passes (regression)
- [x] `node --test test/install-claude.test.js` — passes (regression)
- [x] `node --test test/install-opencode.test.js` — passes (regression)

**Human (verify in terminal before committing):**

*Deferred from Step 3 (promptChecklist):*
- [x] Run `node bin/install.js` in a real TTY. Checklist renders with `[ ] Claude Code` and `[x] Opencode`. Arrow keys move cursor. Space toggles selection. Ctrl-C (or `q`) exits cleanly (exit code 0).

*Step 7:*
- [x] Deselect all items, press Enter → prints `Nothing selected. Exiting.` and exits 0.
- [x] Select only `Claude Code`, press Enter → files copy to `~/.claude/`; confirm `~/.claude/commands/sai-1-spec.md` exists and post-install reminder is printed.
- [x] Select only `Opencode`, press Enter → files copy to `~/.config/opencode/`; if `opencode.jsonc` already exists there, manual agent section instructions are printed instead of copying.
- [x] Run `node bin/install.js --help` → prints usage text and exits 0.

#### Step 7 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks above (including all deferred checks from Step 3) in a terminal, then stage and commit before continuing.

---

#### Step 8: Fix skills copy semantics and add `budget` to Claude install

*(Testable step — RED → GREEN)*

**Two bugs fixed together:**

1. `installClaude` and `installOpencode` use `copy` (silent overwrite) for all skill mappings except `caveman`. The spec requires skip-if-exists for all skills. Existing user-customized skills are silently overwritten on re-install with no output.
2. `installClaude` is missing the `budget` skill mapping. `budget` must be installed for both Claude Code and Opencode.

##### Pre-RED: fix broken tests caused by `copyWithWarn` change

The user updated `copyWithWarn` to print `Creating <dest>` when the file does not exist yet, and `Overwriting <dest>` when it does. The existing "Overwriting warn" tests use a fresh `tmpDir` (no pre-existing files), so they now receive "Creating" and fail. Fix them before adding the new RED tests.

- [x] In `test/install-claude.test.js`, replace the assertion inside the test `installClaude copies sai/instructions/*.md with Overwriting warn`:

Replace:
```js
  assert.ok(messages.some(m => m.startsWith('Overwriting')), 'should print Overwriting for instruction files');
```

With:
```js
  assert.ok(messages.some(m => m.startsWith('Overwriting') || m.startsWith('Creating')), 'should print Overwriting or Creating for instruction files');
```

- [x] In `test/install-opencode.test.js`, replace the assertion inside the test `installOpencode copies sai/instructions/*.md with Overwriting warn`:

Replace:
```js
  assert.ok(messages.some(m => m.startsWith('Overwriting')), 'should print Overwriting for instruction files');
```

With:
```js
  assert.ok(messages.some(m => m.startsWith('Overwriting') || m.startsWith('Creating')), 'should print Overwriting or Creating for instruction files');
```

- [x] Confirm both test files compile: run `node -e "require('./test/install-claude.test.js')"` and `node -e "require('./test/install-opencode.test.js')"` — expected: no error (syntax only check, not a full test run).

##### RED phase

- [x] In `test/install-claude.test.js`, replace the test `installClaude copies five Claude-specific skills` with the version below (renamed to "six", budget assertion flipped from negative to positive):
- [x] Append the test below to `test/install-claude.test.js`, at the end of the file:
- [x] Append the test below to `test/install-opencode.test.js`, at the end of the file:

```js

test('installOpencode skips existing non-caveman skill files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillNames = ['token-efficient-languages', 'budget-explorer', 'budget-executor', 'budget', 'fetch'];
  for (const name of skillNames) {
    const dest = path.join(tmpDir, 'skills', name, 'SKILL.md');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, 'old content');
  }
  installOpencode(tmpDir);
  for (const name of skillNames) {
    const dest = path.join(tmpDir, 'skills', name, 'SKILL.md');
    assert.equal(fs.readFileSync(dest, 'utf8'), 'old content', `skills/${name}/SKILL.md should not be overwritten when already installed`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [x] Verify RED: run `node --test test/install-claude.test.js` — expected: **exit code ≠ 0**; the "six skills" test fails (`budget` not installed → `existsSync` returns false → AssertionError); the skip test fails for existing non-caveman skills (they get overwritten → content ≠ `'old content'`).
- [x] Verify RED: run `node --test test/install-opencode.test.js` — expected: **exit code ≠ 0**; skip test fails for existing non-caveman skills.
- [x] **GATE — DO NOT PROCEED to GREEN until both RED runs are verified.**

##### GREEN phase (only after RED is verified)

- [x] In `bin/install.js`, replace the entire `installClaude` function body with the content below:
- [x] In `bin/install.js`, replace the entire `installOpencode` function body with the content below:

```js
function installOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;

  listMdFiles(path.join(REPOSITORY_ROOT, 'commands', 'opencode')).forEach(src => {
    copy(src, path.join(targetPath, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'commands')).forEach(src => {
    copy(src, path.join(targetPath, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'instructions', path.basename(src)));
  });

  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'caveman', 'SKILL.md'),
    path.join(targetPath, 'skills', 'caveman', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(targetPath, 'skills', 'token-efficient-languages', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-explorer', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-executor', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-executor', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'budget', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'fetch', 'SKILL.md'),
    path.join(targetPath, 'skills', 'fetch', 'SKILL.md')
  );
}
```

- [x] Verify GREEN: run `node --test test/install-claude.test.js` — expected: **exit code = 0, all tests pass**
- [x] Verify GREEN: run `node --test test/install-opencode.test.js` — expected: **exit code = 0, all tests pass**

##### Step 8 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/install-claude.test.js` fails with AssertionError (exit ≠ 0)
- [x] RED verified — `node --test test/install-opencode.test.js` fails with AssertionError (exit ≠ 0)
- [x] GREEN verified — `node --test test/install-claude.test.js` passes (exit = 0, all tests)
- [x] GREEN verified — `node --test test/install-opencode.test.js` passes (exit = 0, all tests)
- [x] `node --test test/copy-helpers.test.js` — passes (regression check)

*(No Human checks — no UI change at this step.)*

#### Step 8 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 9: Update spec, README, and INSTALL files

*(Non-testable step — documentation and spec correction)*

**A. `openspec/changes/npx-installer/specs/npx-installer/spec.md`**

- [x] In `spec.md`, in the `### Requirement: claude-file-map` section, replace the table block with the version below (adds `budget` row):

```markdown
    Source                                             Destination (relative to ~/.claude/)
    commands/claude/*.md                          →    commands/
    sai/commands/*.md                             →    sai/commands/
    sai/instructions/*.md                         →    sai/instructions/
    skills/universal/caveman/SKILL.md             →    skills/caveman/SKILL.md
    skills/universal/token-efficient-languages/SKILL.md → skills/token-efficient-languages/SKILL.md
    skills/claude/budget-explorer/SKILL.md        →    skills/budget-explorer/SKILL.md
    skills/claude/budget-executor/SKILL.md        →    skills/budget-executor/SKILL.md
    skills/claude/fetch/SKILL.md                  →    skills/fetch/SKILL.md
    skills/universal/budget/SKILL.md              →    skills/budget/SKILL.md
```

- [x] In `spec.md`, update the scenario under `### Requirement: claude-file-map` from "eight source paths" to "nine source paths":

Replace:
```markdown
#### Scenario: claude install copies all mapped files
- **WHEN** Claude Code is selected
- **THEN** all eight source paths (glob-expanded where wildcards used) are copied to the correct destinations under `~/.claude/`
```

With:
```markdown
#### Scenario: claude install copies all mapped files
- **WHEN** Claude Code is selected
- **THEN** all nine source paths (glob-expanded where wildcards used) are copied to the correct destinations under `~/.claude/`
```

**B. `openspec/changes/npx-installer/tasks.md`**

- [x] In `tasks.md`, in `## Implementation Context` under `**Conventions**`, remove the line:

```
- `skills/universal/budget/SKILL.md` is mapped for Opencode but absent from Claude's file map — this is intentional per spec, not an oversight
```

And replace with:

```
- `skills/universal/budget/SKILL.md` is mapped for both Claude and Opencode
```

**C. `README.md`**

- [x] In `README.md`, replace the `## Global installation (multi-project)` section (from that heading up to but not including `## Per project installation`) with the content below:

```markdown
## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo.

> **Prerequisites:**
> 1. Install the [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) globally and run `openspec init` in each project. The openspec-dependent `sai-*` commands halt with a clear error if either is missing.
> 2. Copy the `openspec/schemas` folder from this repository into the project root after running `openspec init`.

### Install via npx (recommended)

```
npx github:mmadariaga/shared-ai
```

Presents an interactive checklist to select Claude Code and/or Opencode as targets, then copies all files to the correct OS-aware destinations.

### Manual installation

For step-by-step manual installation without npx:

- Opencode: see [INSTALL.opencode.md](INSTALL.opencode.md)
- Claude Code: see [INSTALL.claude.md](INSTALL.claude.md)

```

**D. `INSTALL.opencode.md`**

- [x] Replace the first line (`# Opencode — Installation`) with:

```markdown
# Opencode — Manual Installation
```

- [x] Insert the following block immediately after the first line (before `## Prerequisites`):

```markdown
> **Recommended:** Run `npx github:mmadariaga/shared-ai` for automated installation. The steps below are for manual installation only.

```

**E. `INSTALL.claude.md`**

- [x] Replace the first line (`# Claude Code — Installation`) with:

```markdown
# Claude Code — Manual Installation
```

- [x] Insert the following block immediately after the first line (before `## Prerequisites`):

```markdown
> **Recommended:** Run `npx github:mmadariaga/shared-ai` for automated installation. The steps below are for manual installation only.

```

##### Step 9 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node --test test/install-claude.test.js` — passes (regression check)
- [x] `node --test test/install-opencode.test.js` — passes (regression check)

**Human (verify before committing):**
- [x] Open `README.md`. The `## Global installation` section shows `npx github:mmadariaga/shared-ai` as the primary install method, with INSTALL files linked under `### Manual installation`.
- [x] Open `INSTALL.opencode.md`. Title reads `# Opencode — Manual Installation`. npx note appears immediately after the title before `## Prerequisites`.
- [x] Open `INSTALL.claude.md`. Title reads `# Claude Code — Manual Installation`. npx note appears immediately after the title.
- [x] Open `specs/npx-installer/spec.md`. Claude file map includes `skills/universal/budget/SKILL.md → skills/budget/SKILL.md`. Scenario says "nine source paths".

#### Step 9 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks above, then stage and commit before continuing.

---

## Appendix: Plan vs Final Implementation

### Step 4 — `forceCopy` renamed to `copy` in actual implementation

**Plan:** The copy helper was named `forceCopy` throughout the plan and tests.

**Final:** The function was implemented as `copy` in `bin/install.js` and exported as `copy`. The function behavior is identical.

### Step 6 — RED phase skipped (already implemented)

**Plan:** RED phase required writing stubs for `installOpencode` and `copyOpencodeConfig`, then running tests to verify assertion failures before implementing GREEN.

**Final:** `installOpencode` and `copyOpencodeConfig` were already fully implemented (not stubs) in `bin/install.js` from an earlier step. The test file passed all 6 tests immediately on first run. No RED→GREEN transition was needed.

**Reason:** The functions were implemented ahead of the plan tracking — likely during Step 4 or 5 when the surrounding copy helpers and `installClaude` were implemented. The code is correct and matches the final GREEN implementation specified in the plan.

### Steps 8–9 — Added in re-run (post-apply amendments)

### Step 8 — copy-helpers.test.js regression fix (not in plan)

**Plan:** Only `install-claude.test.js` and `install-opencode.test.js` needed assertion updates for the `copyWithWarn` "Creating" message change.

**Final:** `copy-helpers.test.js` also failed because the `copyWithWarn prints Overwriting and copies file` test used a fresh tmpDir (no pre-existing dest), so `copyWithWarn` prints "Creating" instead of "Overwriting". Fixed by pre-creating `dest.txt` so the overwrite path is exercised.

**Reason:** The plan only identified the two test files that would fail, but the same `copyWithWarn` behavior change affected any test using a fresh tmpDir with `copyWithWarn` and asserting "Overwriting".

**Step 8:** Two bugs fixed together:
- Non-caveman skills were using `copy` (overwrite) instead of `copySkipIfExists`, violating the skip-if-exists requirement for all skills.
- `installClaude` was missing the `budget` skill mapping. The original spec incorrectly omitted it; `budget` is required for both Claude and Opencode.

**Step 9:** Spec corrected (claude-file-map now includes `budget`; tasks.md convention note updated). Documentation updated: `npx github:mmadariaga/shared-ai` promoted as the official install method; INSTALL files demoted to manual installation docs.
