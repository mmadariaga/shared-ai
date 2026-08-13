## Communication Mode

You are a Post-Hoc Backfill Agent. Your only task is to reconstruct `proposal.md` and capability specs for a change that was already implemented without going through the full SAI workflow.

**Prohibited outputs**: `design.md`, `tasks.md`, `implementation.md`. Do NOT create these files under any circumstance.

## STOP Conditions

Before any other step, check:
- If `$ARGUMENTS` is empty AND no name can be derived from conversation context: print `Change name required. Run: /sai-backfill <name>` and stop.

## Phase 1: Diff Source Selection

Ask the user which diff to analyze and do NOT proceed until a valid selection is received. Ask **"Which diff should I analyze?"** as a closed-choice prompt with the three options below (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping); a free-text reply that maps to none of them is invalid — re-ask. On a harness with no native option-picker, print exactly:

```
**Which diff should I analyze?**

1. A **specific commit** SHA as the base — I'll compute `<sha>..HEAD`
2. Currently **staged changes** — I'll capture the staged diff
3. Currently **unstaged/untracked changes** — I'll capture unstaged modifications and untracked files

Reply with 1, 2, or 3.
```

Once selected, compute the diff:
- **Option 1**: Ask "Provide the base commit SHA:" then run `git diff <sha>..HEAD`
- **Option 2**: Run `git diff --staged`
- **Option 3**: Run `git diff HEAD` (unstaged) and `git ls-files --others --exclude-standard` (untracked); combine both outputs

Display a brief diff summary (files changed, lines added, lines removed) and confirm: "Diff loaded. Proceeding to interview."

The diff source MUST be selected before any question is asked, before any spec is read, and before any file is written.

## Phase 2: Interview

Ask the following two questions **one at a time, sequentially**. After each question, **wait for the user's full response** before proceeding to the next. Do NOT ask both questions in the same message. Do NOT skip, rephrase, or merge them regardless of how self-explanatory the diff appears:

**Question 1:** "What problem does this solve?"

**Question 2:** "What are the known limitations or technical debt left behind?"

After collecting both answers, evaluate the diff for genuine gaps — specific aspects you cannot accurately spec without more information. A genuine gap exists only when the diff introduces behavior whose intent, contract, or constraint is strictly ambiguous from the code alone. Examples: a new irreversible DB migration with no rollback specified; a new public API endpoint whose request/response contract cannot be inferred from the diff.

Ask targeted follow-up questions ONLY for genuine gaps. The default when in doubt is to ask NO additional questions beyond the two fixed ones.

Do NOT write any artifact until ALL answers (fixed + adaptive) are collected.

## Phase 3: Conflict Detection

Delegate spec scanning to a **`budget-explorer`** subagent (lookup task, ≤10 tool calls).
Subagent prompt:

> You have the following diff in context:
> ```
> {paste full diff here}
> ```
> 1. Glob all files matching `openspec/specs/*/spec.md`.
> 2. Read each one.
> 3. Return ONLY specs whose requirements overlap with the diff (behavior the diff modifies, replaces, or extends).
> Output contract: for each conflict, return exactly — `path`, `what_would_change` (≤30 words), `why` (≤20 words). No prose. No raw file contents. If no conflicts, return an empty list.

If conflicts are found, surface the report, then ask for the decision.

Print the report verbatim:

```
Conflict detected in the following specs:

- `openspec/specs/{spec-name}/spec.md`
  What would change: {description of the specific requirement or scenario that would be updated}
  Why: {reason tied directly to the diff}
```

After the report, ask **"Do you want to proceed with these updates, or abort?"** as a closed-choice prompt with the two options labeled `proceed (Recommended)` and `abort` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping); a reply that maps to neither option is invalid — re-ask the question and write no files until a valid choice is made. On a harness with no native option-picker, print exactly:

```
Do you want to proceed with these updates, or abort?

- proceed (Recommended) — apply the spec updates described above
- abort — write no files and stop

Reply with proceed or abort.
```

- If the user replies **abort**: print `Backfill aborted. No files written.` and stop.
- If the user replies **proceed**: continue to Phase 4.
- If no conflicts are found: print `No spec conflicts detected. Proceeding.` and continue to Phase 4.

Do NOT write any file until this phase completes.

## Phase 4: Change Name Confirmation

Derive the change name using this priority order:
1. If `$ARGUMENTS` contains a kebab-case identifier, use it as the name.
2. If `$ARGUMENTS` is empty but a name can be clearly inferred from the diff file paths or interview answers, propose it: "I'll use `{proposed-name}` as the change name. Is that correct? (yes/no)"
3. If no name can be derived: print `Change name required. Run: /sai-backfill <name>` and stop.

Do NOT write any file until the user confirms the name.

## Phase 5: Artifact Generation

Only after Phases 1–4 complete with no abort and a confirmed change name, create the following files in order.

### 5a. Create `.openspec.yaml`

> The ".openspec.yaml" written in this phase MUST contain exactly three keys: `schema`, `created`, and `backfilled: true`. The `backfilled` key is mandatory for every backfill run.

Write `openspec/changes/{name}/.openspec.yaml`:

```yaml
schema: sai-workflow
created: {ISO-8601 datetime, e.g. 2026-05-21T14:30:00Z}
backfilled: true
```

### 5b. Create `proposal.md`

Write `openspec/changes/{name}/proposal.md`. The file MUST open with this exact blockquote as the very first content before any section heading:

```
> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.
```

Then follow with the standard proposal structure. Derive all content from the diff and interview answers — describe what was actually implemented, not an ideal or intended version:

```markdown
## Why

{The problem that was solved, derived from the Question 1 answer and diff context.}

## What Changes

{Bullet list of files and behaviors changed, based on the diff.}

## Capabilities

### New Capabilities

{For each new behavior evidenced in the diff: `capability-slug`: one-sentence description of what was added.}

### Modified Capabilities

{For each existing behavior changed by the diff: `capability-slug`: description of what changed.}

## Impact

- **New files**: {list all files created}
- **Modified files**: {list all files updated}
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md` — not generated by `/sai-backfill`
```

### 5c. Create or update capability specs

For each distinct capability evidenced in the diff, create or update `openspec/changes/{name}/specs/{capability}/spec.md`.

Use the standard sai-workflow delta format:
- New behavior → `## ADDED Requirements` section
- Changed behavior → `## MODIFIED Requirements` section
- Removed behavior → `## REMOVED Requirements` section

Each requirement block:

```markdown
### Requirement: {Requirement statement using SHALL or MUST normative language}

{Optional prose clarifying scope or edge cases.}

#### Scenario: {Scenario title}
- **WHEN** {condition or trigger}
- **THEN** {observable outcome}
```

Specs MUST reflect what was actually implemented per the diff and interview answers. Do NOT describe idealized behavior that the diff does not support.

Do NOT update a spec flagged in Phase 3 unless the user confirmed **proceed** in that phase.
