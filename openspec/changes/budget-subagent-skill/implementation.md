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

*(already applied)*

---

#### Step 10: Address review findings (m1, m2, m3)

*(Non-testable step — text edits only, no new logic)*

**m1 — Verify `sai/instructions/implement.md` references `budget-subagent`**

- [x] Open `sai/instructions/implement.md`. Find the line in `### Step 1: Simplify existing implementation.md` that describes spawning a subagent. Confirm it reads: `spawn a subagent using a cheap model, use **budget-subagent** skill`. If it still says `budget-executor`, change it to `budget-subagent`.

**m2 — Add trailing newline to `skills/universal/budget/SKILL.md`**

- [x] Open `skills/universal/budget/SKILL.md`. The file currently ends without a trailing newline after `  Fetch @skills/token-efficient-languages/SKILL.md`. Rewrite the full file content below (trailing newline included):

```markdown
---
name: budget
description: >
  Load all four budget skills (explorer + executor + subagent + token-efficient-languages) simultaneously. Use when you want to activate cost-discipline rules for the current session.
  TRIGGER when: "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Load and use the skills below:
  Fetch @skills/budget-explorer/SKILL.md
  Fetch @skills/budget-executor/SKILL.md
  Fetch @skills/budget-subagent/SKILL.md
  Fetch @skills/token-efficient-languages/SKILL.md
```

*(The file must end with a blank line / newline after the last `Fetch` line.)*

**m3 — Remove numeric skill count from test descriptions**

- [x] In `test/install-claude.test.js` line 45, change:

```js
test('installClaude copies six Claude-specific skills', () => {
```

to:

```js
test('installClaude copies all Claude-specific skills', () => {
```

- [x] In `test/install-opencode.test.js` line 32, change:

```js
test('installOpencode copies six Opencode-specific skills including budget', () => {
```

to:

```js
test('installOpencode copies all Opencode-specific skills', () => {
```

##### Step 10 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node --test test/install-claude.test.js` — expected: test `installClaude copies all Claude-specific skills` PASSES
- [x] `node --test test/install-opencode.test.js` — expected: test `installOpencode copies all Opencode-specific skills` PASSES

**Human (verify in browser before committing):**

*(No Human checks — all changes are text edits with no UI surface)*

#### Step 10 STOP & COMMIT

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
