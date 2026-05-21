# Extract Commit Rules into Shared Instruction

## Goal

Extract commit message format rules from `sai/instructions/commit.md` into a new `sai/instructions/commit-rules.md`, then update `commit.md` and `apply.md` to load the shared rules via `Fetch` directives — eliminating rule duplication and ensuring `apply.md`'s commit proposals honour Conventional Commits constraints.

## Prerequisites

- Ensure branch is not `master` or `main`. Create `extract-commit-rules-shared-instruction` from `main` before implementing otherwise.

---

### Step-by-Step Instructions

#### Step 1: Create `sai/instructions/commit-rules.md`

*(Non-testable step — new markdown instruction file, no test runner)*

- [x] Create file `sai/instructions/commit-rules.md` with this exact content (verbatim from `commit.md` §Step 4, §Hard Rules, §Self-Critique):

```markdown
## Subject Format

**Subject (line 1):**
- Format: `type(scope): description` or `type: description` (no scope)
- **≤ 50 characters** (hard limit; breaks GitHub UI past 72)
- Imperative mood (`add`, not `added`/`adds`)
- No trailing period
- No emoji unless the user explicitly asks
- Lowercase after the colon (unless an identifier or proper noun)

## Body

**Body (optional):**
- Skip when the subject is self-evident or `--no-body` is passed
- Include when the **why** is non-obvious — context, motivation, trade-offs, hidden constraints
- **Wrap at 72 characters per line**
- Blank line between subject and body
- Focus on *why*, not *what* (the diff already shows what)
- Reference issue / ticket IDs if discoverable in branch name or recent commits
- Note breaking changes with `BREAKING CHANGE: <description>` footer

## Footer

**Footer (optional):**
- `BREAKING CHANGE: ...` for incompatible API changes (also bump subject to `feat!:`/`fix!:`)
- `Refs: #123` / `Closes: #123` if the user mentions an issue or it appears in branch name
- **No `Co-Authored-By` or "Generated with Claude Code" trailers** unless the user explicitly requests them

## Hard Rules

- **Never stage or unstage files.** Operate only on what is already staged.
- **Never run `git commit` without explicit per-invocation authorization.**
- **Never amend a commit that is already pushed** without explicit warning + secondary confirmation.
- **Never use `--no-verify`** to skip hooks. If a pre-commit hook fails, surface the failure, do not bypass it.
- **Never include unstaged content** in the message — describe only `git diff --cached`.
- **Subject ≤ 50 chars, body wrap 72.** Hard limits.
- **Imperative mood, no trailing period, lowercase after colon.**
- **No `Co-Authored-By` / "Generated with Claude Code" trailers** unless the user explicitly asks.
- **No emoji** unless the user explicitly asks.
- **No speculation.** Every claim must map to a staged hunk.
- **Match the repo's commit style.** If recent commits use a particular convention (scope naming, ticket refs, language), match it.

## Self-Critique Checklist

Verify:
1. **Type accuracy** — `feat` only for new capabilities; `fix` only when behavior changed.
2. **Subject length** — ≤ 50 chars, no period, imperative.
3. **Body wrap** — 72 chars per line if body present.
4. **Faithfulness** — every claim backed by `git diff --cached`.
5. **No anticipated work** in the message.
6. **Repo convention match** — prefix style, scope naming, language consistent with recent commits.
7. **Secrets check** — no obvious secret-looking files in staging without warning.
```

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c "git status\|git diff --cached --stat\|git diff --cached --name-status\|git log" sai/instructions/commit-rules.md` — expected: `0` (no git inspection commands)
- [x] `grep -c "### Step [1-6]\|Run in parallel\|Stop conditions" sai/instructions/commit-rules.md` — expected: `0` (no workflow step language)
- [x] `grep -c "Type accuracy\|Subject length\|Body wrap\|Faithfulness\|No anticipated work\|Repo convention match\|Secrets check" sai/instructions/commit-rules.md` — expected: `7` (all seven self-critique items present)
- [x] `grep -c "≤ 50 char" sai/instructions/commit-rules.md` — expected: `3` (Subject Format, Hard Rules, Self-Critique item 2)
- [x] `grep -c "72 char\|72 characters" sai/instructions/commit-rules.md` — expected: `2` (Body section and Self-Critique item 3)

*(No Human checks — no UI involved)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 2: Update `sai/instructions/commit.md` — replace inlined rules

*(Non-testable step — surgical deletion and directive insertion)*

- [x] Read `sai/instructions/commit.md` to confirm current content before editing.
- [x] Delete the `## Hard Rules` section: remove from the `## Hard Rules` heading through the last bullet point (`- **Match the repo's commit style.**...`). Do **NOT** delete the `Fetch skills/token-efficient-languages/SKILL.md` line that follows the section — it is a separate directive and must be preserved.
- [x] Delete the `## Self-Critique Before Presenting` section: remove from the `## Self-Critique Before Presenting` heading through the last checklist item (`7. **Secrets check**...`). Do **NOT** delete the `---` separator that precedes it.
- [x] In the position where `## Self-Critique Before Presenting` was (after the `---` separator), insert `Fetch @sai/instructions/commit-rules.md` as the final line of the file.

The tail of `sai/instructions/commit.md` must look exactly like this after the edit:

```
---

Fetch skills/token-efficient-languages/SKILL.md

---

Fetch @sai/instructions/commit-rules.md
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c "## Hard Rules" sai/instructions/commit.md` — expected: `0` (heading deleted)
- [x] `grep -c "## Self-Critique Before Presenting" sai/instructions/commit.md` — expected: `0` (heading deleted)
- [x] `grep -c "Fetch @sai/instructions/commit-rules.md" sai/instructions/commit.md` — expected: `1` (exactly one directive)
- [x] `grep -c "### Step 1\|### Step 2\|### Step 3\|### Step 4\|### Step 5\|### Step 6" sai/instructions/commit.md` — expected: `6` (all workflow steps unchanged)
- [x] `grep -c "Fetch skills/token-efficient-languages/SKILL.md" sai/instructions/commit.md` — expected: `1` (preserved, not deleted)

*(No Human checks — no UI involved)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 3: Update `sai/instructions/apply.md` — add fetch at Git Operations

*(Non-testable step — single-line insertion)*

- [x] Read `sai/instructions/apply.md` to confirm current content before editing.
- [x] Locate the `## Git Operations` heading. Insert `Fetch @sai/instructions/commit-rules.md` as the first line after `## Git Operations`, before the `**CRITICAL:**` paragraph. Add a blank line between the inserted directive and `**CRITICAL:**`.

The `## Git Operations` section must begin like this after the edit:

```
## Git Operations

Fetch @sai/instructions/commit-rules.md

**CRITICAL:** Do not manage git branches or create commits without explicit user authorization - ask for it.
```

No other lines in `apply.md` are modified, added, or removed.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c "Fetch @sai/instructions/commit-rules.md" sai/instructions/apply.md` — expected: `1` (exactly one directive)
- [x] `grep -n "Fetch @sai/instructions/commit-rules.md\|## Git Operations\|CRITICAL" sai/instructions/apply.md` — expected: `commit-rules` line number appears between `## Git Operations` line number and `CRITICAL` line number (verify by comparing the three line numbers)

*(No Human checks — no UI involved)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 4: Create ADR 0005 — Verbatim extraction of commit rules

*(Non-testable step — new ADR documentation file)*

- [x] Create `docs/adr/0005-verbatim-extraction-of-commit-rules.md` with this exact content:

```markdown
# ADR 0005: Verbatim Extraction of Commit Rules into commit-rules.md

## Status

Accepted

## Context

`sai/instructions/commit.md` inlines all commit message format rules (subject format, body,
footer, hard rules, self-critique checklist) directly in its body. When extracting these rules
into a shared `commit-rules.md`, two approaches exist: copy verbatim, or reformat/paraphrase
to improve readability or consolidate structure.

## Decision

Copy the rule text verbatim from `commit.md` into `commit-rules.md`. Do not reformat, rename
headings, or merge sections.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Verbatim copy (chosen) | Zero drift, unambiguous | Slight duplication of headings |
| Reformat into terse rules | More readable | Interpretation risk, diff noise |
| JSON/YAML rules file | Machine-parseable | Agents don't parse structured data from fetched files |

## Consequences

- `commit-rules.md` content is identical in meaning to what was in `commit.md`, making the
  change verifiable by diff.
- Any future rule update touches only `commit-rules.md`; both `commit.md` and `apply.md`
  inherit via fetch with no edits required.
- A future editor cannot mistake a paraphrase for the original intent — the text is the same.
- Paraphrasing rules creates drift; reverting to a common understanding is hard once diverged.

## Related

- ADR 0003 — Fetch path convention (`@sai/instructions/` prefix) used in the new
  `Fetch @sai/instructions/commit-rules.md` directive.
- ADR 0006 — Placement decision for the fetch directive in `apply.md`.
```

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `test -f docs/adr/0005-verbatim-extraction-of-commit-rules.md` — expected: exit `0` (file exists)

*(No Human checks — no UI involved)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 5: Create ADR 0006 — Placement of commit-rules fetch in apply.md

*(Non-testable step — new ADR documentation file)*

- [x] Create `docs/adr/0006-commit-rules-fetch-placement-in-apply.md` with this exact content:

```markdown
# ADR 0006: Load commit-rules at Git Operations Section Header in apply.md

## Status

Accepted

## Context

`sai/instructions/apply.md` proposes commit messages at STOP & COMMIT markers but has no
reference to commit message format rules. Adding `Fetch @sai/instructions/commit-rules.md`
somewhere in `apply.md` would fix this. Two placement options exist: (a) once at the top of
the `## Git Operations` section, or (b) inline at each individual STOP & COMMIT marker.

## Decision

Insert `Fetch @sai/instructions/commit-rules.md` once, at the top of the `## Git Operations`
section — as the first line after the `## Git Operations` heading, before the `**CRITICAL:**`
paragraph.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Section header (chosen) | One directive, robust to plan restructuring | Loads rules for all git ops, not only commit proposals |
| Inline at each STOP & COMMIT | Surgical, loads only when needed | Fragile — every future STOP & COMMIT marker must include the directive; omission is easy |

## Consequences

- A single directive covers all commit proposals in `## Git Operations`, including future
  STOP & COMMIT markers added to any plan.
- A reader finding it at the section header immediately understands the scope: all git/commit
  operations in this section apply commit-rules.
- If `## Git Operations` is reorganised, the directive stays at the section entry point.

## Related

- ADR 0005 — Explains why `commit-rules.md` contains verbatim rule text.
```

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `test -f docs/adr/0006-commit-rules-fetch-placement-in-apply.md` — expected: exit `0` (file exists)

*(No Human checks — no UI involved)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 6: Update `sai/instructions/commit-rules.md` — add type classification

*(Non-testable step — prepend section to existing file)*

- [x] Read `sai/instructions/commit-rules.md` to confirm current content before editing.
- [x] Insert a new `## Commit Type Classification` section as the first section of the file — immediately before the existing `## Subject Format` heading. Use this exact content:

```markdown
## Commit Type Classification

Pick exactly one Conventional Commits type, in this priority order:

| Type | When |
|------|------|
| `feat` | New user-facing capability or new public API surface |
| `fix` | Bug fix that changes behavior the user could observe |
| `perf` | Measurable performance improvement, no behavioral change |
| `refactor` | Code restructured without changing behavior or perf |
| `docs` | Only docs/README/comments |
| `test` | Only test files added or modified |
| `build` | Build system, dependencies, lockfiles, package manager config |
| `ci` | CI configuration only (`.github/`, `.gitlab-ci.yml`, etc.) |
| `chore` | Maintenance: tooling config, file moves, formatting-only diffs not covered above |
| `style` | Whitespace/formatting only — code semantics unchanged |
| `revert` | Reverts a prior commit (subject: `revert: <reverted subject>`) |

```

The file must start with `## Commit Type Classification` and `## Subject Format` must follow it.

##### Step 6 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c "## Commit Type Classification" sai/instructions/commit-rules.md` — expected: `1`
- [x] `grep -c "| \`feat\`" sai/instructions/commit-rules.md` — expected: `1` (type table present)
- [x] `grep -n "## Commit Type Classification\|## Subject Format" sai/instructions/commit-rules.md` — expected: `## Commit Type Classification` line number is lower than `## Subject Format` line number

*(No Human checks — no UI involved)*

#### Step 6 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 7: Update `sai/instructions/commit.md` — move fetch to top, simplify Steps 2 and 4

*(Non-testable step — four surgical edits)*

- [ ] Read `sai/instructions/commit.md` to confirm current content before editing.

**Edit A — Move fetch to top:** Insert `Fetch @sai/instructions/commit-rules.md` between the first `---` separator (after Communication Mode) and `## Required Inputs`. Apply this exact replacement:

Replace:
```
---

## Required Inputs
```
With:
```
---

Fetch @sai/instructions/commit-rules.md

## Required Inputs
```

**Edit B — Simplify Step 2:** Replace the type table and its opening sentence with a single reference line, keeping only the mixing-types guidance. Apply this exact replacement:

Replace:
```
### Step 2: Classify the Change

Pick exactly one Conventional Commits type, in this priority order:

| Type | When |
|------|------|
| `feat` | New user-facing capability or new public API surface |
| `fix` | Bug fix that changes behavior the user could observe |
| `perf` | Measurable performance improvement, no behavioral change |
| `refactor` | Code restructured without changing behavior or perf |
| `docs` | Only docs/README/comments |
| `test` | Only test files added or modified |
| `build` | Build system, dependencies, lockfiles, package manager config |
| `ci` | CI configuration only (`.github/`, `.gitlab-ci.yml`, etc.) |
| `chore` | Maintenance: tooling config, file moves, formatting-only diffs not covered above |
| `style` | Whitespace/formatting only — code semantics unchanged |
| `revert` | Reverts a prior commit (subject: `revert: <reverted subject>`) |

If the diff genuinely mixes types, prefer the dominant user-visible one and mention the secondary in the body. Suggest splitting only when types are clearly independent (e.g. unrelated `feat` + `fix`).
```
With:
```
### Step 2: Classify the Change

Pick one type using the classification table in commit-rules.md, in priority order.

If the diff genuinely mixes types, prefer the dominant user-visible one and mention the secondary in the body. Suggest splitting only when types are clearly independent (e.g. unrelated `feat` + `fix`).
```

**Edit C — Simplify Step 4:** Replace the Subject/Body/Footer format content with a single reference line. Apply this exact replacement:

Replace:
```
### Step 4: Compose the Message

**Subject (line 1):**
- Format: `type(scope): description` or `type: description` (no scope)
- **≤ 50 characters** (hard limit; breaks GitHub UI past 72)
- Imperative mood (`add`, not `added`/`adds`)
- No trailing period
- No emoji unless the user explicitly asks
- Lowercase after the colon (unless an identifier or proper noun)

**Body (optional):**
- Skip when the subject is self-evident or `--no-body` is passed
- Include when the **why** is non-obvious — context, motivation, trade-offs, hidden constraints
- **Wrap at 72 characters per line**
- Blank line between subject and body
- Focus on *why*, not *what* (the diff already shows what)
- Reference issue / ticket IDs if discoverable in branch name or recent commits
- Note breaking changes with `BREAKING CHANGE: <description>` footer

**Footer (optional):**
- `BREAKING CHANGE: ...` for incompatible API changes (also bump subject to `feat!:`/`fix!:`)
- `Refs: #123` / `Closes: #123` if the user mentions an issue or it appears in branch name
- **No `Co-Authored-By` or "Generated with Claude Code" trailers** unless the user explicitly requests them
```
With:
```
### Step 4: Compose the Message

Apply format rules from commit-rules.md — subject, body, and footer conventions.
```

**Edit D — Remove trailing fetch:** Delete the trailing `---` separator and `Fetch @sai/instructions/commit-rules.md` at the end of the file. Apply this exact replacement:

Replace:
```
5. On `n` → STOP. Tell the user the message is ready to copy from above.

---

Fetch @sai/instructions/commit-rules.md
```
With:
```
5. On `n` → STOP. Tell the user the message is ready to copy from above.
```

##### Step 7 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `grep -c "Fetch @sai/instructions/commit-rules.md" sai/instructions/commit.md` — expected: `1` (one directive, at top — trailing removed)
- [ ] `grep -n "Fetch @sai/instructions/commit-rules.md\|## Required Inputs" sai/instructions/commit.md` — expected: fetch line number is lower than `## Required Inputs` line number (fetch is before inputs)
- [ ] `grep -c "≤ 50 characters\|Wrap at 72 characters\|BREAKING CHANGE" sai/instructions/commit.md` — expected: `0` (Step 4 format content removed)
- [ ] `grep -c "classification table in commit-rules.md" sai/instructions/commit.md` — expected: `1` (Step 2 reference)
- [ ] `grep -c "Apply format rules from commit-rules.md" sai/instructions/commit.md` — expected: `1` (Step 4 reference)
- [ ] `grep -c "### Step 1\|### Step 2\|### Step 3\|### Step 4\|### Step 5\|### Step 6" sai/instructions/commit.md` — expected: `6` (all workflow steps intact)
- [ ] `tail -3 sai/instructions/commit.md | grep -c "commit-rules"` — expected: `0` (no fetch at end of file)

*(No Human checks — no UI involved)*

#### Step 7 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Verification check count mismatch for "≤ 50 char"

**Plan:** Verification check `grep -c "≤ 50 char" sai/instructions/commit-rules.md` expected `2` (Subject Format and Hard Rules).
**Final:** Expected count corrected to `3` (Subject Format, Hard Rules, Self-Critique item 2).
**Reason:** The verbatim content from `commit.md` (as specified by the plan) contains three occurrences of "≤ 50 char" — line 5 (Subject Format: "≤ 50 characters"), line 36 (Hard Rules: "Subject ≤ 50 chars"), and line 47 (Self-Critique item 2: "≤ 50 chars"). The original check did not account for the Self-Critique occurrence.
