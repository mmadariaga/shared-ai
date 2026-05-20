# token-efficient-languages-skill

## Goal

Create a universal `SKILL.md` encoding the 3-rule language contract, wire it into slash commands, extend `/budget` on both harnesses, replace 9 inline `Language:` blocks in SAI instruction files with a Fetch pointer, and add install steps in `INSTALL.claude.md` and `README.md`.

## Prerequisites

- Ensure branch is not master or main. Create `token-efficient-languages-skill` from `main` before implementing otherwise.

---

### Step-by-Step Instructions

#### Step 1: Create universal skill file

*(Non-testable — plain file creation, no build step)*

- [x] Create directory `skills/universal/token-efficient-languages/` if it does not exist.
- [x] Copy and paste content below into `skills/universal/token-efficient-languages/SKILL.md` (new file):

```markdown
---
name: token-efficient-languages
description: Activates the 3-rule language contract for token efficient reasoning — english reasoning, language efficiency, think in english. Loaded by /token-efficient-languages command or any sai-* skill.
license: MIT
metadata:
  author: shared-ai
  version: "1.0"
---

## Language Contract

1. **Reason in English** — The agent MUST think and reason internally in English unless the user explicitly requests otherwise.
2. **Respond in user's language** — The agent SHALL respond to the user in the language they write in (default to English if unclear).
3. **Artifacts in English** — All artifacts (documents, code, technical explanations) SHALL be written in English unless the user explicitly requests otherwise.
```

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `cat skills/universal/token-efficient-languages/SKILL.md` — file exists and is readable
- [x] `grep -c 'name:\|description:\|license:\|author:\|version:' skills/universal/token-efficient-languages/SKILL.md` — expected: `5`
- [x] `grep -cE 'claude|opencode|subagent|model:' skills/universal/token-efficient-languages/SKILL.md` — expected: `0`
- [x] `grep -c 'MUST\|SHALL' skills/universal/token-efficient-languages/SKILL.md` — expected: `3` (one per rule)

*(No Human checks — no UI component.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 2: Create Claude Code slash command

*(Non-testable — plain file creation)*

- [x] Copy and paste content below into `claude/commands/token-efficient-languages.md` (new file):

```markdown
---
description: Load the token-efficient-languages skill and activate the 3-rule language contract (reason in English, respond in user's language, artifacts in English).
---

Fetch @~/.claude/skills/token-efficient-languages/SKILL.md
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `cat claude/commands/token-efficient-languages.md` — file exists
- [x] `grep 'Fetch @~/.claude/skills/token-efficient-languages/SKILL.md' claude/commands/token-efficient-languages.md` — expected: match found
- [x] `grep 'description:' claude/commands/token-efficient-languages.md` — expected: match found

*(No Human checks.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 3: Create OpenCode slash command

*(Non-testable — plain file creation)*

- [x] Copy and paste content below into `opencode/commands/token-efficient-languages.md` (new file):

```markdown
---
description: Load the token-efficient-languages skill and activate the 3-rule language contract (reason in English, respond in user's language, artifacts in English).
---

Fetch @~/.config/opencode/skills/token-efficient-languages/SKILL.md
```

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `cat opencode/commands/token-efficient-languages.md` — file exists
- [x] `grep 'Fetch @~/.config/opencode/skills/token-efficient-languages/SKILL.md' opencode/commands/token-efficient-languages.md` — expected: match found
- [x] `grep 'description:' opencode/commands/token-efficient-languages.md` — expected: match found

*(No Human checks.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 4: Extend `/budget` — Claude Code

*(Non-testable — single-line append)*

- [x] Open `claude/commands/budget.md`. Append the third Fetch line after the two existing ones. The file must look exactly like this after the edit:

```markdown
---
description: Load both Claude Code budget skills (explorer + executor) simultaneously. Use when you want to activate cost-discipline subagent rules for the current session.
---

Fetch @skills/claude/budget-explorer/SKILL.md
Fetch @skills/claude/budget-executor/SKILL.md
Fetch @~/.claude/skills/token-efficient-languages/SKILL.md
```

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c '^Fetch' claude/commands/budget.md` — expected: `3`
- [x] `grep -n 'Fetch' claude/commands/budget.md` — expected: lines show explorer → executor → token-efficient-languages in that order
- [x] `grep 'description:' claude/commands/budget.md` — description field value unchanged from pre-change HEAD

*(No Human checks.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 5: Extend `/budget` — OpenCode

*(Non-testable — single-line append)*

- [x] Open `opencode/commands/budget.md`. Append the third Fetch line after the two existing ones. The file must look exactly like this after the edit:

```markdown
---
description: Load both OpenCode budget skills (explorer + executor) simultaneously. Use when you want to activate cost-discipline subagent rules for the current session.
---

Fetch @skills/opencode/budget-explorer/SKILL.md
Fetch @skills/opencode/budget-executor/SKILL.md
Fetch @~/.config/opencode/skills/token-efficient-languages/SKILL.md
```

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c '^Fetch' opencode/commands/budget.md` — expected: `3`
- [x] `grep -n 'Fetch' opencode/commands/budget.md` — expected: lines show explorer → executor → token-efficient-languages in that order
- [x] `grep 'description:' opencode/commands/budget.md` — description field value unchanged from pre-change HEAD

*(No Human checks.)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 6: Replace inline `Language:` blocks in 9 SAI instruction files

*(Non-testable — 9 file edits)*

Replace each Language block with the single line `Fetch skills/universal/token-efficient-languages/SKILL.md`. Use the exact old strings below to locate each block. The indentation of the Fetch line should match the leading whitespace of the replaced line (dropping only the bullet `- ` or blockquote `> ` prefix).

**6a — `instructions/sai/accessibility.md` (line 321)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts (`openspec/changes/{change-name}/accessibility.md`, documents, code references, technical explanations) are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6b — `instructions/sai/apply.md` (line 86)**

- [x] Locate and replace:

```
   > You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts (documents, code, technical explanations) are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6c — `instructions/sai/commit.md` (line 147)**

- [x] Locate and replace:

```
    - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). Commit messages are written in English unless the repo's recent history clearly uses another language.
```

with:

```
    Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6d — `instructions/sai/implement.md` (line 260)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts (`openspec/changes/{change-name}/implementation.md`, documents, code, technical explanations) are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6e — `instructions/sai/performance.md` (line 343)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts (`openspec/changes/{change-name}/performance.md`, documents, code references, technical explanations) are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6f — `instructions/sai/pr.md` (line 141)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). The PR body is written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6g — `instructions/sai/review.md` (line 44)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts (`openspec/changes/{change-name}/review.md`, documents, code references, technical explanations) are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6h — `instructions/sai/security.md` (line 318)**

- [x] Locate and replace:

```
   - **Language:** You MUST think and reason internally in English unless the user explicitly requests otherwise. Respond to the user in the language they write in (default to English if unclear). All artifacts are written in English unless the user explicitly requests otherwise.
```

with:

```
   Fetch skills/universal/token-efficient-languages/SKILL.md
```

**6i — `instructions/sai/spec.propose.md` (line 37)**

- [x] Locate and replace:

```
- **Language:** Think and reason internally in English unless the user explicitly requests otherwise. Respond in the user's language (default English if unclear). All artifacts are written in English unless the user explicitly requests otherwise.
```

with:

```
Fetch skills/universal/token-efficient-languages/SKILL.md
```

##### Step 6 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -nE '^\s*-\s+\*\*Language:\*\*' instructions/sai/*.md` — expected: **zero matches** (all 9 Language bullets removed)
- [x] `grep -nE '^\s*>\s+You MUST think' instructions/sai/*.md` — expected: **zero matches** (apply.md blockquote removed)
- [x] `grep -c 'Fetch skills/universal/token-efficient-languages/SKILL.md' instructions/sai/accessibility.md instructions/sai/apply.md instructions/sai/commit.md instructions/sai/implement.md instructions/sai/performance.md instructions/sai/pr.md instructions/sai/review.md instructions/sai/security.md instructions/sai/spec.propose.md` — expected: each file shows `1`
- [x] `diff <(git show HEAD:instructions/sai/remember.md) instructions/sai/remember.md` — expected: **no diff** (remember.md unchanged)
- [x] `grep -n 'Language' instructions/sai/*.md` — expected: only unrelated headings remain (`## Language` in glossary-format, `### Language-Specific Detection Hints` in security.md, `Domain Language` in implement.md and review.md)

*(No Human checks.)*

#### Step 6 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 7: Add install step in `INSTALL.claude.md`

*(Non-testable — bash/PowerShell code block edits inside Markdown)*

The file has two blocks to edit: a bash block and a PowerShell block. Both insertions go between the caveman copy step and the budget-explorer copy step.

**7a — Bash block**

- [x] Locate this exact anchor in the bash block of `INSTALL.claude.md`:

```bash
fi
mkdir -p ~/.claude/skills/budget-explorer
```

- [ ] Replace it with:

```bash
fi
mkdir -p ~/.claude/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.claude/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.claude/skills/budget-explorer
```

**7b — PowerShell block**

- [x] Locate this exact anchor in the PowerShell block of `INSTALL.claude.md`:

```powershell
}
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-explorer" | Out-Null
```

- [ ] Replace it with:

```powershell
}
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$env:USERPROFILE\.claude\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-explorer" | Out-Null
```

##### Step 7 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -n 'token-efficient-languages' INSTALL.claude.md` — expected: 4 matches (mkdir + cp in bash, New-Item + Copy-Item in PowerShell)
- [x] `grep -A2 'caveman/SKILL.md' INSTALL.claude.md` — verify that in both blocks, `token-efficient-languages` lines appear immediately after the caveman copy and before `budget-explorer`
- [x] Read `INSTALL.claude.md` and visually confirm no `[ ! -f ... ]` guard wraps the new `cp` line (unconditional, per Decision D3)

*(No Human checks.)*

#### Step 7 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

---

#### Step 8: Add install step in `README.md` (bash + PowerShell sections)

*(Non-testable — code block edits inside Markdown)*

Two insertions: one in the bash OpenCode install block and one in the PowerShell OpenCode install block. Both go between the caveman copy step and the budget-explorer copy step.

**8a — Bash block (around line 250)**

- [x] Locate this exact anchor in the bash OpenCode install block of `README.md`:

```bash
fi
mkdir -p ~/.config/opencode/skills/budget-explorer
```

- [ ] Replace it with:

```bash
fi
mkdir -p ~/.config/opencode/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.config/opencode/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-explorer
```

**8b — PowerShell block (around line 296)**

- [x] Locate this exact anchor in the PowerShell OpenCode install block of `README.md`:

```powershell
}
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-explorer" | Out-Null
```

- [ ] Replace it with:

```powershell
}
New-Item -ItemType Directory -Force -Path "$configDir\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$configDir\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-explorer" | Out-Null
```

##### Step 8 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -n 'token-efficient-languages' README.md` — expected: 4 matches (mkdir + cp in bash, New-Item + Copy-Item in PowerShell)
- [x] `grep -A2 'caveman/SKILL.md' README.md` — verify `token-efficient-languages` lines appear immediately after caveman copy and before `budget-explorer` in both blocks
- [x] Read the relevant README.md lines and confirm the PowerShell `Copy-Item` line uses `$configDir` variable (already in scope above)
- [x] Read the relevant README.md lines and confirm no `[ ! -f ... ]` guard wraps the new `cp` line (unconditional, per Decision D3)

*(No Human checks.)*

#### Step 8 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass.

## Appendix: Plan vs Final Implementation

### Step 6 — Fetch paths used `universal` segment that doesn't exist post-install

**Plan:** All 9 Fetch lines used `skills/universal/token-efficient-languages/SKILL.md`.
**Final:** Changed to `skills/token-efficient-languages/SKILL.md` (dropped `universal/` segment).
**Reason:** The skill file lives at `skills/universal/token-efficient-languages/SKILL.md` in the repo, but once installed to `~/.claude/skills/` or `~/.config/opencode/skills/`, the `universal` segment is gone. Fetch must point to the post-install path. Install `cp` lines keep `universal/` since they reference the source location.

### Step 8 — grep count for token-efficient-languages in README.md

**Plan:** Expected exactly 4 matches (2 in bash block + 2 in PowerShell block).
**Final:** 5 matches found — the 4 install-block matches are present as intended, plus 1 pre-existing reference on line 26 (`[Token-Efficient Languages](#token-efficient-languages)`) that predates this change.
**Reason:** Plan did not account for the pre-existing mention in the README introduction. No change to logic needed.
