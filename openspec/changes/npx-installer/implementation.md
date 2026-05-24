# npx-installer

## Goal

Add `package.json` and `bin/install.js` to enable one-command installation via `npx github:mmadariaga/shared-ai`, with an interactive terminal checklist for selecting Claude Code and/or Opencode as installation targets. Fix copy semantics: vendor commands skip-if-exists; sai/commands, sai/instructions, and all skills always overwrite with a log line. Add `budget` skill to the Claude install map.

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

*(already applied)*

---

#### Step 8: Fix copy semantics, add `budget` to Claude, log all operations

*(Testable step — RED → GREEN)*

**Copy rules (final):**

| File group | Rule | Function |
|------------|------|----------|
| `commands/claude/*.md`, `commands/opencode/*.md` | Skip if exists, no overwrite | `copySkipIfExists` |
| `sai/commands/*.md` | Always overwrite, always log | `copyWithWarn` |
| `sai/instructions/*.md` | Always overwrite, always log | `copyWithWarn` |
| All skill files | Always overwrite, always log | `copyWithWarn` |

**Note:** Previous RED tests (Pre-RED and old-RED phases below) were written against an earlier spec that used `copySkipIfExists` for skills and `copy` for commands. Those tests are now wrong — Step 8 GREEN replaces them with tests that match the final copy rules.

##### Pre-RED: fix broken `copyWithWarn` tests (already applied)

The existing "Overwriting warn" tests use a fresh `tmpDir`, so they receive "Creating" (not "Overwriting") with the updated `copyWithWarn`. These assertions were already fixed.

- [x] In `test/install-claude.test.js`, updated assertion in `installClaude copies sai/instructions/*.md with Overwriting warn` to accept `'Overwriting'` or `'Creating'`.
- [x] In `test/install-opencode.test.js`, same fix for `installOpencode copies sai/instructions/*.md with Overwriting warn`.
- [x] Both files compile without error.

##### Old RED phase (superseded — tests were correct for old spec, now wrong)

The tests below were added based on an earlier spec that used `copySkipIfExists` for skills. They are now wrong (skills must overwrite) and must be removed in GREEN.

- [x] In `test/install-claude.test.js`, replaced `installClaude copies five Claude-specific skills` with `installClaude copies six Claude-specific skills` (added budget assertion).
- [x] In `test/install-claude.test.js`, appended `installClaude skips existing non-caveman skill files` — **WRONG, remove in GREEN**.
- [x] In `test/install-opencode.test.js`, appended `installOpencode skips existing non-caveman skill files` — **WRONG, remove in GREEN**.
- [x] Verified RED: both test suites failed with AssertionError.

##### GREEN phase

**A. Clean up wrong tests**

- [x] In `test/install-claude.test.js`, remove the test `installClaude skips existing non-caveman skill files` (entire `test(...)` block including the closing `});`). Note: do NOT remove `installClaude skips existing skill files` — that test covers caveman and remains correct.
- [x] In `test/install-opencode.test.js`, remove the test `installOpencode skips existing non-caveman skill files` (entire `test(...)` block).

**B. Add correct tests**

- [x] Append the tests below to `test/install-claude.test.js`:

```js

test('installClaude skips existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old content');
  installClaude(tmpDir);
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), 'old content', 'existing vendor command should not be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude overwrites existing non-caveman skill files and logs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  const messages = [];
  const origLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  installClaude(tmpDir);
  console.log = origLog;
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing non-caveman skill should be overwritten');
  assert.ok(messages.some(m => m.startsWith('Overwriting')), 'should log Overwriting for existing skill');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [x] Append the tests below to `test/install-opencode.test.js`:

```js

test('installOpencode skips existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old content');
  installOpencode(tmpDir);
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), 'old content', 'existing vendor command should not be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites existing non-caveman skill files and logs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  const messages = [];
  const origLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  installOpencode(tmpDir);
  console.log = origLog;
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing non-caveman skill should be overwritten');
  assert.ok(messages.some(m => m.startsWith('Overwriting')), 'should log Overwriting for existing skill');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

**C. Confirm still RED (before touching `bin/install.js`)**

- [x] Run `node --test test/install-claude.test.js` — expected: **exit code ≠ 0**; `installClaude copies six Claude-specific skills` fails (budget not installed); `installClaude skips existing vendor command files` fails (current `copy` overwrites commands); `installClaude overwrites existing skill files and logs` fails (current `copy` produces no log).
- [x] Run `node --test test/install-opencode.test.js` — expected: **exit code ≠ 0**; same reasons for Opencode.
- [x] **GATE — DO NOT PROCEED to code changes until RED is confirmed.**

**D. Implement new `installClaude` and `installOpencode`**

- [x] In `bin/install.js`, replace the entire `installClaude` function with:

```js
function installClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;

  listMdFiles(path.join(REPOSITORY_ROOT, 'commands', 'claude')).forEach(src => {
    copySkipIfExists(src, path.join(targetPath, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'commands')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'instructions', path.basename(src)));
  });

  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'caveman', 'SKILL.md'),
    path.join(targetPath, 'skills', 'caveman', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(targetPath, 'skills', 'token-efficient-languages', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-explorer', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-executor', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-executor', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'fetch', 'SKILL.md'),
    path.join(targetPath, 'skills', 'fetch', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'budget', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget', 'SKILL.md')
  );
}
```

- [x] In `bin/install.js`, replace the entire `installOpencode` function with:

```js
function installOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;

  listMdFiles(path.join(REPOSITORY_ROOT, 'commands', 'opencode')).forEach(src => {
    copySkipIfExists(src, path.join(targetPath, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'commands')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'instructions', path.basename(src)));
  });

  copySkipIfExists(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'caveman', 'SKILL.md'),
    path.join(targetPath, 'skills', 'caveman', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(targetPath, 'skills', 'token-efficient-languages', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-explorer', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-executor', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-executor', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'budget', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'fetch', 'SKILL.md'),
    path.join(targetPath, 'skills', 'fetch', 'SKILL.md')
  );
}
```

- [x] Verify GREEN: run `node --test test/install-claude.test.js` — expected: **exit code = 0, all tests pass**
- [x] Verify GREEN: run `node --test test/install-opencode.test.js` — expected: **exit code = 0, all tests pass**

##### Step 8 Verification Checklist

**Automated (agent runs before stopping):**
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

- [ ] Replace the `### Requirement: copy-rule-commands` section with:

```markdown
### Requirement: copy-rule-commands
Vendor command files (`commands/claude/*.md`, `commands/opencode/*.md`) MUST be skipped if the destination file already exists. No error is raised; the installer prints:
    Skipping <destination-path> (already exists)

SAI command files (`sai/commands/*.md`) MUST always be overwritten. Before overwriting, the installer MUST print:
    Overwriting <destination-path>
or, if the file does not exist:
    Creating <destination-path>

#### Scenario: existing vendor command skipped
- **WHEN** a `.md` file already exists at the destination vendor command path
- **THEN** it is not overwritten and the skip message is printed

#### Scenario: sai command always overwritten
- **WHEN** `sai/commands/*.md` is copied
- **THEN** the destination is always written and a log line is printed
```

- [ ] Replace the `### Requirement: copy-rule-skills` section with:

```markdown
### Requirement: copy-rule-skills
`skills/universal/caveman/SKILL.md` MUST be skipped if already installed at the destination (skip-if-exists). No error is raised; the installer prints:
    Skipping <destination-path> (already exists)

All other skill files (`skills/**/SKILL.md`) MUST always be overwritten at the destination. Before writing, the installer MUST print:
    Overwriting <destination-path>
or, if the file does not exist:
    Creating <destination-path>

#### Scenario: caveman already installed
- **WHEN** `skills/caveman/SKILL.md` already exists at the destination
- **THEN** the file is not overwritten and the skip message is printed

#### Scenario: non-caveman skill already installed
- **WHEN** any other `SKILL.md` already exists at the target skill path
- **THEN** the file IS overwritten and the Overwriting message is printed

#### Scenario: skill not yet installed
- **WHEN** no `SKILL.md` exists at the target skill path
- **THEN** the file is copied, parent directories are created if needed, and the Creating message is printed
```

- [ ] In the `### Requirement: claude-file-map` section, replace the table block with (adds `budget` row):

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

- [ ] Update the claude-file-map scenario from "eight source paths" to "nine source paths".

**B. `openspec/changes/npx-installer/tasks.md`**

- [ ] In `## Implementation Context` under `**Conventions**`, replace the line about `budget`:

Replace:
```
- `skills/universal/budget/SKILL.md` is mapped for Opencode but absent from Claude's file map — this is intentional per spec, not an oversight
```

With:
```
- `skills/universal/budget/SKILL.md` is mapped for both Claude and Opencode
- Vendor commands (`commands/claude/`, `commands/opencode/`) use skip-if-exists; `sai/commands/`, `sai/instructions/`, and all skills always overwrite with a log line
```

**C. `README.md`**

- [ ] Replace the `## Global installation (multi-project)` section (from that heading up to but not including `## Per project installation`) with:

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

- [ ] Replace the first line (`# Opencode — Installation`) with:

```markdown
# Opencode — Manual Installation
```

- [ ] Insert the following block immediately after the first line (before `## Prerequisites`):

```markdown
> **Recommended:** Run `npx github:mmadariaga/shared-ai` for automated installation. The steps below are for manual installation only.

```

**E. `INSTALL.claude.md`**

- [ ] Replace the first line (`# Claude Code — Installation`) with:

```markdown
# Claude Code — Manual Installation
```

- [ ] Insert the following block immediately after the first line (before `## Prerequisites`):

```markdown
> **Recommended:** Run `npx github:mmadariaga/shared-ai` for automated installation. The steps below are for manual installation only.

```

##### Step 9 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `node --test test/install-claude.test.js` — passes (regression check)
- [ ] `node --test test/install-opencode.test.js` — passes (regression check)

**Human (verify before committing):**
- [ ] Open `README.md`. The `## Global installation` section shows `npx github:mmadariaga/shared-ai` as the primary install method, with INSTALL files linked under `### Manual installation`.
- [ ] Open `INSTALL.opencode.md`. Title reads `# Opencode — Manual Installation`. npx note appears immediately after the title before `## Prerequisites`.
- [ ] Open `INSTALL.claude.md`. Title reads `# Claude Code — Manual Installation`. npx note appears immediately after the title.
- [ ] Open `specs/npx-installer/spec.md`. Vendor commands are skip-if-exists; skills always overwrite. Claude file map includes `budget` row. Scenario says "nine source paths".

#### Step 9 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all Human checks above, then stage and commit before continuing.

---

## Appendix: Plan vs Final Implementation

### Step 4 — `forceCopy` renamed to `copy` in actual implementation

**Plan:** The copy helper was named `forceCopy` throughout the plan and tests.

**Final:** The function was implemented as `copy` in `bin/install.js` and exported as `copy`. Behavior is identical.

### Step 6 — RED phase skipped (already implemented)

**Plan:** RED phase required writing stubs for `installOpencode` and `copyOpencodeConfig`, then verifying assertion failures.

**Final:** Both functions were already fully implemented. Tests passed immediately.

### Step 7 — variable names changed

**Final code** uses `REPOSITORY_ROOT` (not `ROOT`) and `targetPath` (not `base`) for local variables. These are the names used in the Step 8 GREEN code blocks above.

### Steps 8–9 — Added in re-run (post-apply amendments)

**Step 8:** Copy semantics revised. Final rules:
- Vendor commands (`commands/claude/`, `commands/opencode/`): `copySkipIfExists`
- `sai/commands/`, `sai/instructions/`, all skills: `copyWithWarn` (always overwrite + log)
- `budget` skill added to Claude install map

Intermediate RED tests for `copySkipIfExists` on skills were written and verified as failing, then superseded by the spec change. GREEN replaced them with tests matching final rules.

**Step 9:** Spec corrected for new copy rules and budget addition. README and INSTALL files updated with npx as official install method.
