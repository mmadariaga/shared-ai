## Communication Mode

You are a Post-Hoc Backfill Agent. Your only task is to reconstruct `proposal.md` and capability specs for a change that was already implemented without going through the full SAI workflow.

**Prohibited outputs**: `design.md`, `tasks.md`, `implementation.md`. Do NOT create these files under any circumstance.

**State boundary**: the selected diff is verified implementation evidence. An optional statement of intent is explanatory context kept only in the current conversation and worker state; it is never written to the change directory and is never treated as equivalent to the diff.

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

## Phase 2: Optional Intent Capture

After the valid diff has been selected, loaded, summarized, and the existing `Diff loaded. Proceeding to interview.` confirmation has been emitted, offer exactly two declared choices through the harness's native option-picker, in this order:

1. `Provide intent (Recommended)`
2. `Continue without intent`

Use this canonical English prompt exactly, rendered in the user's language under `remember.md` and falling back to English when no language is available:

`Do you have a statement of intent to share below? You can also type it directly in the free-text box.`

The harness-provided free-text slot is the only paste channel. On a surface without a native option-picker, present the same two choices and the same free-text slot using the established two-option-plus-free-text fallback; do not add another input channel or request a file path.

Resolve the interaction as follows:

- An explicit native option selection takes precedence over simultaneously returned free text. `Provide intent (Recommended)` captures attached non-empty text; `Continue without intent` discards attached text.
- Selecting `Provide intent (Recommended)` without non-empty text emits this clean follow-up exactly once, rendered by the same language rule, and then waits for the free-text response: `Share your statement of intent below.`
- A free-text value maps to a declared option only when its trimmed, case-insensitive value exactly equals that option's value. A value that matches neither option is captured as the candidate statement.
- After trimming for emptiness, whitespace-only text means no intent.
- Accept any non-empty explanatory prose, including a `/sai-explore` handoff block or a different handoff format, without schema validation, normalization into a file, or a file-path request.

When the result is no intent, discard any attached text and continue through the existing fixed interview without intent-specific parsing, reconciliation, conflict context, provenance, marker text, or artifact content. Do not change the no-intent behavior.

## Intent Reconciliation

When a non-empty candidate statement is captured, retain the raw statement only in the current conversation and worker state. Before the fixed interview, derive the following in-memory records without persisting the raw statement or a parsed-intent file:

1. **Intent items** — each stated capability, constraint, and boundary, kept in the statement's order.
2. **Rejected-alternative context** — each explicitly rejected alternative that constrains the result. Keep it separate from intent items; it is never an intent item, diff item, normative requirement, or targeted-question item. Report each retained rejected alternative to the user and keep it for the conflict scan.
3. **Diff items** — each distinct externally observable behavior or constraint evidenced by one or more related diff hunks, kept in selected-diff file order and hunk order.

Do not create diff items for pure formatting, comment-only, or behavior-preserving refactor hunks. Keep unrelated behaviors separate even when they share a file. Compare material meaning rather than identical wording: semantically equivalent evidence covers every material part of an intent item; missing any material part does not.

Classify every item exactly once:

- An intent item with complete direct or semantically equivalent diff evidence is `matched`.
- An intent item with any material part lacking diff evidence is `stated-but-unevidenced`.
- A diff item not covered by any intent item is `evidenced-but-unstated`.
- One diff item may support multiple matching intent items without duplication and without scope drift.

A candidate has usable intent context when it contains at least one intent item or at least one rejected-alternative context entry. A non-empty candidate with neither is explicitly reported as `No usable intent was identified.` and follows the ordinary no-intent path for reconciliation, conflict input, provenance, marker, and artifact generation.

Items classified as `matched` may be represented as ordinary evidence-backed behavior. `stated-but-unevidenced` items remain non-normative until qualifying evidence is supplied. `evidenced-but-unstated` items are scope drift, not implementation errors, and remain eligible for specification from the diff.

## Phase 3: Interview

Ask the following two questions **one at a time, sequentially**. After each question, **wait for the user's full response** before proceeding to the next. Do NOT ask both questions in the same message. Do NOT skip, rephrase, or merge them regardless of diff content or captured intent:

**Delivery (fixed and adaptive interview questions alike).** Every question in this phase is open-ended free text, not a closed set — the "Closed-choice prompts" rule in `remember.md` does NOT apply here. Emit the question string **exactly once**, as ordinary conversation text, and end the turn there. Do NOT also route it through the harness option-picker / question tool (`AskUserQuestion` on Claude Code, `question` on opencode), and do NOT echo, restate, or re-print the question in the same turn — a question rendered both as text and through a tool reaches the user duplicated.

**Question 1:** "What problem does this solve?"

**Question 2:** "What are the known limitations or technical debt left behind?"

After both fixed answers are collected:

- With no usable intent, evaluate the diff for genuine gaps using the existing rule. Ask targeted follow-ups ONLY for specific aspects that cannot be accurately specified from the diff; the default when in doubt is to ask none.
- With usable intent, ask the generated reconciliation questions below instead of treating unsupported intent as an ordinary adaptive gap.

### Reconciliation Questions

Ask generated questions one at a time, after both fixed questions and before any conflict scan or artifact write. The first five `stated-but-unevidenced` items in reconciliation order each receive one targeted question that quotes or identifies the item and names the code evidence that would substantiate it. If more than five remain, ask one grouped overflow question covering all remaining items; never create a seventh generated question.

For each answer, add `confirmed-preservation` to the original item only when the answer directly and unambiguously states that the named behavior or boundary was intentionally preserved or left unchanged. An answer describing omission, deferral, accident, ambiguity, contradiction, or mere absence does not qualify. Keep the required three-way classification unchanged. A qualifying confirmation permits that confirmed boundary to enter a normative artifact; every other unsupported claim remains outside normative requirements.

Do NOT write any artifact until all fixed questions, generated reconciliation questions, and any existing conflict or change-name gates are complete.

### Scope Drift Report

Before conflict detection and artifact generation, report every `evidenced-but-unstated` item in the form:

`Scope drift (not an implementation error): {item}. The selected diff evidences this behavior, but the supplied intent statement did not name it.`

Continue specification unless an existing conflict gate or user decision aborts the run. Keep the evidenced behavior eligible for a generated capability spec.

## Phase 4: Conflict Detection

Delegate spec scanning to a **`budget-explorer`** subagent (lookup task, ≤10 tool calls).

When there is no usable intent context, use this existing diff-only prompt unchanged:

> You have the following diff in context:
> ```
> {paste full diff here}
> ```
> 1. Glob all files matching `openspec/specs/*/spec.md`.
> 2. Read each one.
> 3. Return ONLY specs whose requirements overlap with the diff (behavior the diff modifies, replaces, or extends).
> Output contract: for each conflict, return exactly — `path`, `what_would_change` (≤30 words), `why` (≤20 words). No prose. No raw file contents. If no conflicts, return an empty list.

When usable intent context exists, give the same subagent the selected diff plus this additional in-conversation context, authored from the in-memory classifications and never written to disk:

```
Intent statement:
{the original supplied statement}

Capabilities:
- {every usable intent capability}

Constraints:
- {every usable intent constraint or confirmed boundary}

Other intent context:
- {every rejected-alternative entry and every usable item that cannot clearly be grouped}
```

The enriched prompt keeps the same scan scope and output contract: return ONLY overlapping specs, with exactly `path`, `what_would_change` (≤30 words), and `why` (≤20 words), no prose, and no raw file contents. Do not pass a non-usable candidate as synthetic intent context.

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
- If the user replies **proceed**: continue to Phase 5.
- If no conflicts are found: print `No spec conflicts detected. Proceeding.` and continue to Phase 5.

Do NOT write any file until this phase completes.

## Phase 5: Change Name Confirmation

Derive the change name using this priority order:
1. If `$ARGUMENTS` contains a kebab-case identifier, use it as the name.
2. If `$ARGUMENTS` is empty but a name can be clearly inferred from the diff file paths or interview answers, propose it: "I'll use `{proposed-name}` as the change name. Is that correct? (yes/no)"
3. If no name can be derived: print `Change name required. Run: /sai-backfill <name>` and stop.

Do NOT write any file until the user confirms the name.

## Phase 6: Artifact Generation

Only after Phases 1–5 complete with no abort and a confirmed change name, create the following files in order. The only permitted writes are `.openspec.yaml`, `proposal.md`, and capability specs under the selected change directory. Never create `design.md`, `tasks.md`, or `implementation.md`.

### 6a. Create `.openspec.yaml`

For a run with no usable intent context, write exactly these three keys and no others:

```yaml
schema: sai-workflow
created: {calendar date in YYYY-MM-DD, e.g. 2026-05-21}
backfilled: true
```

For a run with usable intent context, write exactly these four keys and no others:

```yaml
schema: sai-workflow
created: {calendar date in YYYY-MM-DD, e.g. 2026-05-21}
backfilled: true
prior_intent: true
```

`created` MUST be a date only in `YYYY-MM-DD` form, never a datetime. Do not add `backfilled_at`, `backfilled_from`, a raw statement, parsed intent, or any other companion key.

### 6b. Create `proposal.md`

Write `openspec/changes/{name}/proposal.md`. For a run with no usable intent context, the file MUST open with this exact blockquote as the very first content before any section heading:

```
> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.
```

For a run with usable intent context, use this exact first line instead:

```
> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.
```

Then follow the standard proposal structure. Derive all content from the selected diff, fixed interview answers, evidence-backed reconciliation results, qualifying preservation confirmations, and scope-drift reports. Describe what was implemented, not an unsupported ideal. Do not copy the raw statement or any parsed-intent serialization into the proposal. Unconfirmed claims, unanswered gaps, rejected alternatives, and omissions remain outside normative requirements; a confirmed deliberate preservation may be described only as an evidence-backed boundary.

The proposal MUST contain these headings in this order: `## Why`, `## What Changes`, `## Capabilities`, `### New Capabilities`, `### Modified Capabilities`, and `## Impact`. Fill `Why` from the first fixed answer and the diff. Fill `What Changes` with the implemented file and behavior changes, including evidenced scope drift only as implemented behavior. List each diff-backed new or modified capability under the corresponding capability subsection. Under `## Impact`, list concrete new and modified files and end with `Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill`. Do not leave instructional text, template markers, or unresolved placeholders in the written proposal.

### 6c. Create or update capability specs

For each distinct capability evidenced in the diff, create or update `openspec/changes/{name}/specs/{capability}/spec.md`.

Use the standard sai-workflow delta format:
- New behavior → `## ADDED Requirements` section
- Changed behavior → `## MODIFIED Requirements` section
- Removed behavior → `## REMOVED Requirements` section

Each requirement MUST use a concrete `### Requirement:` heading with SHALL or MUST normative language, followed by optional concrete scope prose and at least one `#### Scenario:` block containing exactly one `- **WHEN**` line and one `- **THEN**` line. Write only behavior from the diff, fixed answers, or qualifying preservation evidence. Do not leave instructional text or unresolved placeholders in a spec. Do not turn unconfirmed intent, an unanswered gap, a rejected alternative, or an omission into a normative requirement. Do not update a spec flagged in Phase 4 unless the user confirmed **proceed** in that phase.

## Completion Boundary

After all permitted backfill artifacts are written, stop. Do not create any planning artifact, run another SAI command, or invoke an archive command from this flow.

Verification commands (run both, exact):
1. npm test
2. node --test test/install-claude.test.js test/install-opencode.test.js test/verified-precondition-handback.test.js

Verification pass condition: both commands exit successfully.

Do not update implementation.md checkboxes. Do not act on the STOP & COMMIT marker. Return the exact 9-field apply report required by the worker contract, including field 8 with only non-scratch production paths and field 9 when available.
