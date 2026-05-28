# budget-subagent-skill

## Goal

Add the `budget-subagent` skill (Claude Code and Opencode variants) for cheap general-purpose task delegation, wire it into the `budget` loader, update both install docs, update the automated installer, and add test coverage.

## Prerequisites

- Ensure branch is not master or main. Ask the user to select the branch to use:
  1. `budget-subagent-skill` (derived from the change name)
  2. Custom branch name (free input — e.g., backlog-linked name like `JIRA-123-feature-name`)
- If the selected branch does not exist, create it from `main` before implementing.

### Step-by-Step Instructions

---

#### Step 1: Create skills/claude/budget-subagent/SKILL.md

*(already applied)*

---

#### Step 2: Create skills/opencode/budget-subagent/SKILL.md

*(already applied)*

---

#### Step 3: Update configs/opencode.jsonc

*(already applied)*

---

#### Step 4: Update skills/universal/budget/SKILL.md

*(already applied)*

---

#### Step 5: Update INSTALL.claude.md

*(already applied)*

---

#### Step 6: Update INSTALL.opencode.md

*(already applied)*

---

#### Step 7: Update bin/install-flow.js

*(already applied)*

---

#### Step 8: Update install tests

*(already applied)*

---

#### Step 9: Address review findings (M1 rename cheap→budget, M2 README, m1 test assertions, m2 description)

*(Non-testable step — config, doc, spec, and test assertion updates; no new business logic)*

Resolve all four review findings from `review.md`. The user confirmed `budget` as the chosen agent keyword for the Opencode binding (aligning with the `budget-*` skill family convention). M1 and m2 are both resolved by updating the Opencode SKILL.md and all dependent artifacts to use `budget` instead of `cheap`. M2 is resolved by restoring the deleted executor section and adding a parallel budget-subagent entry. m1 is resolved by adding tighter test assertions pinned to the `"budget"` key.

---

**M1 + m2: Rename `cheap` → `budget` in Opencode artifacts and update spec/design**

- [x] Overwrite `skills/opencode/budget-subagent/SKILL.md` with the following complete content (fixes m2 description, renames binding to `budget`):

```markdown
---
name: budget-subagent
description: >
  Binds cost-controlled task delegation to the OpenCode `budget` agent keyword. Model resolved via agent.budget.model in the project's opencode.jsonc — not hardcoded here. Use for general-purpose task delegation (file operations, searches, writes, code analysis).
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Universal Behavior

1. **Single-task scope.** Execute exactly one task as described in the prompt. Do NOT expand scope, refactor unrelated code, suggest improvements, or perform work beyond what was explicitly requested.

2. **No self-correction on failure.** Do NOT retry a failed sub-operation, attempt workarounds, or modify your approach to force a different outcome. Report the failure as-is and stop.

3. **Minimize output verbosity.** Do NOT dump raw file contents, unfiltered search results, or verbose log streams. Output SHALL be limited to the completion report fields.

4. **Structured completion report.** Upon finishing (successfully or not), return a structured report with exactly these fields:

   ```
   status: success | partial | failed
   actions_taken:
     - <concise action description> (one line each)
   failures:
     - <what failed>: <why, one line> (omit section if none)
   output: <key result or artifact, if small enough to inline — omit if large>
   ```

5. **Permission-block-aborts.** If any tool call would require interactive user approval, abort the task immediately. Return `status: failed` with a `failures` entry identifying the blocked operation and the permission required. Do NOT wait or retry.

6. **Tool-call soft cap.** Limit yourself to approximately 30 tool calls per task invocation. If the task cannot be completed within this budget, stop, set `status: partial`, and list remaining work in `failures`.

## OpenCode Binding

- **Agent keyword**: `budget` (lowercase)
- **Model resolution**: controlled by `agent.budget.model` in the project's `opencode.jsonc` — not hardcoded in this file
- **Tool-call cap**: none enforced by harness (behavioral rule 6 governs this)
- **Raw output**: not allowed — always use the structured completion report format
```

- [x] Overwrite `configs/opencode.jsonc` with the following complete content (renames `"cheap"` key to `"budget"`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "read": {
      "~/.ssh/**": "deny",
      "~/.gnupg/**": "deny",
      "~/.aws/**": "deny",
      "~/.azure/**": "deny",
      "~/.kube/**": "deny",
      "~/.docker/**": "deny",
      "~/.config/gcloud/**": "deny",
      ".env*": "deny",
      "*.pem": "deny",
      "*.key": "deny",
      "*.p12": "deny",
      "*.jks": "deny",
      "*credentials*": "deny"
    }
  },
  "agent": {
    "explore": {
      "mode": "subagent",
      // Put your trusted low-cost model here
      "model": "opencode-go/deepseek-v4-flash"
    },
    "executor": {
      "mode": "subagent",
      // Put your trusted low-cost model here
      "model": "opencode-go/deepseek-v4-flash"
    },
    "budget": {
      "mode": "subagent",
      // Put your trusted low-cost model here
      "model": "opencode-go/deepseek-v4-flash"
    }
  }
}
```

- [x] Edit `INSTALL.opencode.md` — in the bash `else` block (around line 85), replace:

  ```
      echo '    "cheap": {'
  ```

  with:

  ```
      echo '    "budget": {'
  ```

- [x] Edit `INSTALL.opencode.md` — in the PowerShell `else` block (around line 147), replace:

  ```
      Write-Host '    "cheap": {'
  ```

  with:

  ```
      Write-Host '    "budget": {'
  ```

- [x] Edit `bin/install-flow.js` — in `copyOpencodeConfig()` (around line 239), replace:

  ```javascript
    console.log('    "cheap": {');
  ```

  with:

  ```javascript
    console.log('    "budget": {');
  ```

- [x] Overwrite `openspec/changes/budget-subagent-skill/specs/budget-subagent-platform-bindings/spec.md` with the following complete content (replaces `subagent` keyword references with `budget`, adds keyword rationale):

```markdown
## ADDED Requirements

### Requirement: claude-code-binding
The `skills/claude/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to Claude Code's Agent tool with the following fixed parameters:

    subagent_type: "General"   // required for full tool access (read, write, search, bash)
    model: "haiku"             // MUST be set explicitly on every spawn
    tool-call cap: none enforced by harness (skill behavioral rules govern this)

The compatibility field in the YAML frontmatter MUST be `claude`. The description MUST include the trigger phrases: `"budget subagent"`, `"cheap subagent"`, `"budget task"`, `"cheap task"`.

#### Scenario: model is never omitted
- **WHEN** a caller spawns a budget-subagent using the Claude Code Agent tool
- **THEN** the `model: "haiku"` parameter is always present in the call, preventing fallback to the parent model tier

#### Scenario: general subagent type used
- **WHEN** the task requires writing a file or running a shell command
- **THEN** `subagent_type: "General"` is used (not `Explore`, which is read-only)

---

### Requirement: opencode-binding
The `skills/opencode/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to the Opencode `budget` agent keyword. The model SHALL be resolved via `agent.budget.model` in the project's `opencode.jsonc` — it MUST NOT be hardcoded in the skill file.

The compatibility field in the YAML frontmatter MUST be `opencode`. The description MUST include the same trigger phrases as the Claude Code variant.

> **Keyword rationale**: `budget` was chosen over the original `subagent` to align with the `budget-*` skill family naming convention (`budget-explorer`, `budget-executor`, `budget-subagent`). `subagent` was rejected because it describes the mechanism, not the cost tier. `cheap` was used temporarily during initial implementation and renamed to `budget` for the same alignment reason.

#### Scenario: model resolved from config
- **WHEN** the skill is invoked in Opencode
- **THEN** the model used is the one set in `agent.budget.model` in `opencode.jsonc`, not a value from the skill file

#### Scenario: agent keyword matches config key
- **WHEN** the skill references the subagent binding
- **THEN** it uses the keyword `budget` (lowercase), matching the key in the `agent` block of `opencode.jsonc`

---

### Requirement: opencode-config-entry
The `configs/opencode.jsonc` template SHALL include a `"budget"` entry under the `"agent"` block, parallel to the existing `"executor"` entry, with `mode: "subagent"` and a placeholder model comment.

The entry MUST follow this shape:

    "budget": {
      "mode": "subagent",
      // Put your trusted low-cost model here
      "model": "opencode-go/deepseek-v4-flash"
    }

#### Scenario: config is consistent with skill
- **WHEN** an Opencode user installs the config and invokes budget-subagent
- **THEN** Opencode resolves the model from `agent.budget.model` without error

#### Scenario: parallel to executor entry
- **WHEN** a user inspects opencode.jsonc
- **THEN** `executor` and `budget` both appear as sibling keys under `agent`, with identical structure
```

- [x] Edit `openspec/changes/budget-subagent-skill/design.md` — insert the following new decision section immediately before the `## Risks / Trade-offs` heading:

```markdown
### 5. Opencode agent keyword: `budget` (not `subagent`)

**Decision**: The Opencode config key and agent keyword use `budget`, not the spec-proposed `subagent`.

- **Hard to reverse**: Low — the key lives in user config files; each existing user must update their `opencode.jsonc` manually when the keyword changes.
- **Surprising without context**: Yes — the spec says `subagent`, the first implementation used `cheap`, and the final name is `budget`. A reader following the spec would use the wrong key.
- **Real trade-off**: Yes. Three candidates were evaluated:
  - `subagent` (spec default): describes the mechanism, not the cost tier; creates no connection to the sibling skills
  - `cheap`: short but not aligned with the `budget-*` skill family; negative connotation
  - `budget`: consistent with `budget-explorer`, `budget-executor`, `budget-subagent` naming; clearly communicates the cost tier without denigrating the model quality

**Chosen approach**: `budget` — matches the skill family naming convention and aligns with the cost-discipline framing used throughout the README.

```

---

**M2: Restore executor sub-agent section and add budget-subagent documentation in README.md**

- [x] Edit `README.md` — in the Skills table, add a `budget-subagent` row immediately after the `| \`budget-executor\` |` row, and update the `budget` row description to reference all four skills. Replace this existing single row:

  ```
  | `budget` | Loads all budget skills simultaneously (`budget-explorer` + `budget-executor` + `token-efficient-languages`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |
  ```

  with these two rows:

  ```
  | `budget-subagent` | Low-cost agent for general-purpose task delegation — file reads, searches, writes, code analysis. Model resolved via `agent.budget.model` in `opencode.jsonc` (or `subagent_type: General` + `model: haiku` in Claude Code). Enforces single-task discipline: structured completion report, ~30-call soft cap, no raw output. | `"budget subagent"`, `"cheap subagent"`, `"budget task"` |
  | `budget` | Loads all budget skills simultaneously (`budget-explorer` + `budget-executor` + `budget-subagent` + `token-efficient-languages`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |
  ```

- [x] Edit `README.md` — in the `## Cost-Effective Strategies` section, locate the two blank lines that follow "Available as skills for both Claude Code and OpenCode." (end of the Explore Sub-Agent subsection, before `## Project highlights`). Replace those two blank lines with the following content:

  ```markdown

  ### Executor Sub-Agent

  Verbose shell commands (tests, builds, lints) are delegated to the **executor sub-agent** (running a cheap model). The executor runs the exact command as instructed — no retrying, no workarounds — and returns a structured failure report (exit code + key reason + file:line). This prevents the main agent from wasting tokens on verbose build logs or test output. Available as skills for both Claude Code and Opencode.

  ### Budget Sub-Agent

  General-purpose task delegation (file reads, searches, writes, code analysis) is handed off to the **budget sub-agent** (running a cheap model). The budget sub-agent executes exactly one task, returns a structured completion report (`status` / `actions_taken` / `failures`), and aborts on permission blocks rather than waiting. A soft ~30-call cap prevents scope drift on multi-step work. Available as skills for both Claude Code and Opencode.
  ```

---

**m1: Tighten copyOpencodeConfig test assertions to pin the `budget` key**

- [x] Edit `test/install-opencode.test.js` — in the test `'copyOpencodeConfig skips copy and prints instructions when opencode.jsonc exists'` (around line 60), add the following line immediately after the existing `assert.ok(printed.includes('"agent"'), ...)` assertion:

  ```javascript
    assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  ```

- [x] Edit `test/install-opencode.test.js` — in the test `'copyOpencodeConfig skips copy and prints instructions when opencode.json exists'` (around line 71), add the following line immediately after the existing `assert.ok(printed.includes('"agent"'), ...)` assertion:

  ```javascript
    assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  ```

---

##### Step 9 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c '"cheap"' skills/opencode/budget-subagent/SKILL.md` — expected: `0` ✓
- [x] `grep -c '"cheap"' configs/opencode.jsonc` — expected: `0` ✓
- [x] `grep -c '"cheap"' bin/install-flow.js` — expected: `0` ✓
- [x] `grep -c '"cheap"' INSTALL.opencode.md` — expected: `0` ✓
- [x] `grep '"budget"' configs/opencode.jsonc` — expected: 1 match on the key line ✓
- [x] `grep -c 'budget' skills/opencode/budget-subagent/SKILL.md` — expected: at least 3 (keyword line, model resolution line, description) ✓ (6 matches)
- [x] `grep -c 'Executor Sub-Agent' README.md` — expected: `1` ✓
- [x] `grep -c 'budget-subagent' README.md` — expected: at least `2` (Skills table row, budget row description) ✓ (2 matches)
- [x] `node --test test/install-opencode.test.js` — expected: all tests pass (new `'"budget"'` assertions pass because copyOpencodeConfig now prints `"budget"`) ✓ (tests 5 & 6 pass)

*(No Human checks — config, doc, spec, and test file changes; no UI-rendered content.)*

#### Step 9 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 3 — Agent config key: `"subagent"` → `"cheap"` → `"budget"`

**Plan:** Add a `"subagent"` key inside the `"agent"` block in `configs/opencode.jsonc`.
**Interim:** Added `"cheap"` instead (user preference during initial implementation).
**Final (Step 9):** Renamed from `"cheap"` to `"budget"` to align with the `budget-*` skill family naming convention. Decision recorded in `design.md` Decision 5.

### Step 6 — Agent config snippet: `"subagent"` → `"cheap"` → `"budget"`

**Plan:** The bash `else` and PowerShell `else` branches in `INSTALL.opencode.md` should echo/Write-Host a `"subagent"` agent block.
**Final (Step 9):** Both branches emit a `"budget"` block — first changed to `"cheap"` during initial apply, then to `"budget"` in Step 9.

### Step 7 — grep count is 4, not 3

**Plan:** `grep -c "budget-subagent" bin/install-flow.js` outputs `3`.
**Final:** Outputs `4` — each `copyWithWarn` call spans two lines (source path + dest path), so two insertions produce 4 matching lines total.
**Reason:** Plan miscounted; actual implementation is correct.

### Step 7 — copyOpencodeConfig: `"subagent"` → `"cheap"` → `"budget"`

**Plan:** Insert a `"subagent"` block in `copyOpencodeConfig()`.
**Final (Step 9):** Uses `"budget"` — first changed to `"cheap"` during initial apply, then renamed to `"budget"` in Step 9.
