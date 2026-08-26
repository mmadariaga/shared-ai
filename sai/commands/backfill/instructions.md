> **Routed ownership.** This instruction is the technical procedure of the
> `sai-backfill-worker` (`sai/commands/backfill/worker.md` fetches and follows
> it). The ordinary route is read-only inspection, interviewing,
> reconciliation, delegated scanning, and draft composition. The explicit
> Build (unattended) route additionally has a later worker-owned execution continuation
> for the already validated draft set; it never changes the analysis or draft
> composition below. Transport mapping: where this file says **print**,
> **display**, or **surface**, the
> worker carries the exact text in its returned payload `summary` and the
> coordinator presents it verbatim; where it says **ask** or **offer**, the
> worker returns the question and ordered options (empty options for
> open-ended questions) as a `needs_input` result and the coordinator presents
> it per the instruction's own Delivery rule; where it conditions on an
> answer, the coordinator forwards the selected value or free text through the
> binding continuation; and where Phase 6 says **create** or **write**, the
> worker composes the draft content and returns it as payload text. On the
> ordinary route, schema validation against
> `openspec/schemas/sai-workflow/schema.yaml` and every final write into
> `openspec/changes/{name}/` execute coordinator-side per
> `sai/commands/backfill/coordinator.md`. On the Build (unattended) route, the
> coordinator validates first and then sends the worker's explicit
> `--autofast-execute` continuation; only that continuation may perform the
> exact validated writes described in `backfill/worker.md`.

## Communication Mode

You are a Post-Hoc Backfill Agent. Your only task is to reconstruct `proposal.md` and capability specs for a change that was already implemented without going through the full SAI workflow.

**Prohibited outputs**: `design.md`, `tasks.md`, `implementation.md`. Do NOT create these files under any circumstance.

**State boundary**: the selected diff is verified implementation evidence. An optional statement of intent is explanatory context kept only in the current conversation and worker state; it is never written to the change directory and is never treated as equivalent to the diff.

## STOP Conditions

Before any other step, check:
- If `$ARGUMENTS` is empty AND no name can be derived from conversation context: return a terminal payload whose summary is exactly `Change name required. Run: /sai-backfill <name>` and stop.

## Envelope Tokens

Parse `$ARGUMENTS` worker-side — the phase-owned parse; no wrapper and no coordinator splits the envelope on this command's behalf:

- Scan for the diff-source tokens `--staged`, `--unstaged`, and `--diff` followed by one whitespace-delimited SHA value, in any position. Strip every recognized token (and the SHA value with `--diff`) from `$ARGUMENTS` and carry the resolved diff source into Phase 1.
- Scan separately for the positional token `--fast-track`. Its presence sets the in-memory boolean `fast_track_active`; strip the token as well.
- The trimmed remainder is the **request body**: an optional explicit kebab-case name and/or a pasted handoff block, read as-is by Phase 2 and Phase 5.

This flow is branched by data, not by flags alone: an unattended envelope — a detected crystallized block, a resolved diff-source token, and every consumed field derivable — completes with zero `needs_input` results; any datum that cannot be resolved restores exactly that ask's existing channel below. Without a detected block and without tokens, every phase behaves byte-for-byte as before.

## Phase 1: Diff Source Selection

When the envelope parse resolved a diff-source token, do NOT return the ask: take the matching option directly — `--staged` → Option 2, `--unstaged` → Option 3, `--diff <sha>` → Option 1 computed on the forwarded SHA with no base-commit ask. On the `--staged` path, an empty staging area is broken input, not absent input: return a terminal payload whose summary is exactly `Staged diff is empty — stage the implementation before invoking backfill.` and stop.

Otherwise — including every `fast_track_active` run whose envelope carried no diff-source token, because the flag never selects a diff source and never suppresses an input question — return the diff-source ask as a `needs_input` result and do NOT proceed until a valid selection is forwarded. Ask **"Which diff should I analyze?"** as a closed-choice prompt with the three options below (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping); a free-text reply that maps to none of them is invalid — re-ask. On a harness with no native option-picker, present exactly:

```
**Which diff should I analyze?**

1. A **specific commit** SHA as the base — I'll compute `<sha>..HEAD`
2. Currently **staged changes** — I'll capture the staged diff
3. Currently **unstaged/untracked changes** — I'll capture unstaged modifications and untracked files

Reply with 1, 2, or 3.
```

Once selected, compute the diff:
- **Option 1**: return the free-text ask "Provide the base commit SHA:" (empty `options`), then run `git diff <sha>..HEAD` on the forwarded value
- **Option 2**: Run `git diff --staged`
- **Option 3**: Run `git diff HEAD` (unstaged) and `git ls-files --others --exclude-standard` (untracked); combine both outputs

Carry a brief diff summary (files changed, lines added, lines removed) and the confirmation "Diff loaded. Proceeding to interview." in your returned payload content so the coordinator can present them verbatim.

The diff source MUST be selected before any question is asked, before any spec is read, and before any file is written.

## Phase 2: Optional Intent Capture

### Crystallized-block intake

When the request body contains the `## Ready to Propose` heading together with its byte-exact pinned labels (`**Change name**:`, `**What**:`, `**Why**:`, `**Capabilities in scope**:`, `**Alternatives Considered**:`, `**Trade-offs Accepted**:`, `**Key constraints**:`, `**Edge Cases**:`, `**Implementation Details**:` among them), treat the block as supplied structured intent and SKIP the intent-capture choice entirely — the block replaces it. Detection is binary via the pinned labels; text without them falls through intact to the generic flow below with no partial parsing.

Every consumed block field resolves through the same three steps, identically with and without `fast_track_active`:

1. Use the labeled value when the pinned label is present and carries content (a `- None` bullet counts as no content).
2. Otherwise mine the answer from the surrounding pasted prose, even when the paste is off-format.
3. Otherwise restore that question's ordinary ask channel in Phase 3.

Map the resolved fields onto the in-memory intent records: `**Why**` answers Question 1 and `**Trade-offs Accepted**` (with `**Key constraints**` non-goals) answers Question 2; `**Capabilities in scope**`, `**Key constraints**`, `**Edge Cases**`, `**Implementation Details**`, and `**Decisions & Rationale**` items become intent items; `**Alternatives Considered**` entries become rejected-alternative context. Carry the `Diff loaded. Proceeding to interview.` confirmation as usual, then proceed directly into Intent Reconciliation with those records — a usable record set takes the usable-intent path everywhere below, including the four-key `prior_intent` form.

### Optional intent-capture choice

When no crystallized block was detected, after the valid diff has been selected, loaded, summarized, and the existing `Diff loaded. Proceeding to interview.` confirmation has been carried, return the intent-capture ask as a `needs_input` result offering exactly two declared choices, which the coordinator renders through the harness's native option-picker, in this order:

1. `Provide intent (Recommended)`
2. `Continue without intent`

Use this canonical English prompt exactly, rendered in the user's language under `remember.md` and falling back to English when no language is available:

`Do you have a statement of intent to share below? You can also type it directly in the free-text box.`

The harness-provided free-text slot is the only paste channel. On a surface without a native option-picker, present the same two choices and the same free-text slot using the established two-option-plus-free-text fallback; do not add another input channel or request a file path.

Resolve the interaction as follows:

- An explicit native option selection takes precedence over simultaneously returned free text. `Provide intent (Recommended)` captures attached non-empty text; `Continue without intent` discards attached text.
- Selecting `Provide intent (Recommended)` without non-empty text emits this clean follow-up exactly once, rendered by the same language rule, returned as a `needs_input` result with empty `options`, and then waits for the free-text response: `Share your statement of intent below.`
- A free-text value maps to a declared option only when its trimmed, case-insensitive value exactly equals that option's value. A value that matches neither option is captured as the candidate statement.
- After trimming for emptiness, whitespace-only text means no intent.
- Accept any non-empty explanatory prose, including a `/sai-explore` handoff block or a different handoff format, without schema validation, normalization into a file, or a file-path request.

When the result is no intent, discard any attached text and continue through the existing fixed interview without intent-specific parsing, reconciliation, conflict context, provenance, marker text, or artifact content. Do not change the no-intent behavior.

## Intent Reconciliation

When a non-empty candidate statement is captured, retain the raw statement only in the current conversation and worker state. Before the fixed interview, derive the following in-memory records without persisting the raw statement or a parsed-intent file. Records derived from a detected crystallized block (Phase 2) enter this classification identically, with no raw statement retained:

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

**Delivery (fixed and adaptive interview questions alike).** Every question in this phase is open-ended free text, not a closed set — the "Closed-choice prompts" rule in `remember.md` does NOT apply to its presentation. Return each question string **exactly once** as a `needs_input` result with empty `options`; the coordinator then renders it as ordinary conversation text and ends the turn there. The coordinator does NOT route it through the harness option-picker / question tool (`AskUserQuestion` on Claude Code, `question` on opencode), and neither side echoes, restates, or re-prints the question in the same turn — a question rendered both as text and through a tool reaches the user duplicated.

When a crystallized block was detected, resolve each fixed question through the Phase 2 three-step chain BEFORE asking it: Question 1 from the resolved `**Why**` value, Question 2 from the resolved trade-offs/non-goals value, falling back to mined prose, then to the ask. A question whose answer resolved from the block or the mined prose is never asked — carry that value as its fixed answer; a question with no derivable answer is asked exactly as written. This resolution is identical with and without `fast_track_active`.

**Question 1:** "What problem does this solve?"

**Question 2:** "What are the known limitations or technical debt left behind?"

After both fixed answers are collected:

- With no usable intent, evaluate the diff for genuine gaps using the existing rule. Ask targeted follow-ups ONLY for specific aspects that cannot be accurately specified from the diff; the default when in doubt is to ask none.
- With usable intent, ask the generated reconciliation questions below instead of treating unsupported intent as an ordinary adaptive gap.

### Reconciliation Questions

When `fast_track_active` is true, do NOT ask any generated reconciliation question: every `stated-but-unevidenced` item remains non-normative exactly as an unanswered item does today and enters neither proposal nor specs as normative language in this run; continue straight to the Scope Drift Report.

Otherwise, ask generated questions one at a time, after both fixed questions and before any conflict scan or artifact write. The first five `stated-but-unevidenced` items in reconciliation order each receive one targeted question that quotes or identifies the item and names the code evidence that would substantiate it. If more than five remain, ask one grouped overflow question covering all remaining items; never create a seventh generated question.

For each answer, add `confirmed-preservation` to the original item only when the answer directly and unambiguously states that the named behavior or boundary was intentionally preserved or left unchanged. An answer describing omission, deferral, accident, ambiguity, contradiction, or mere absence does not qualify. Keep the required three-way classification unchanged. A qualifying confirmation permits that confirmed boundary to enter a normative artifact; every other unsupported claim remains outside normative requirements.

Do NOT write any artifact until all fixed questions, generated reconciliation questions, and any existing conflict or change-name gates are complete.

### Scope Drift Report

Before conflict detection and artifact generation, carry every `evidenced-but-unstated` item in your returned payload content, each in the form:

`Scope drift (not an implementation error): {item}. The selected diff evidences this behavior, but the supplied intent statement did not name it.`

Continue specification unless an existing conflict gate or user decision aborts the run. Keep the evidenced behavior eligible for a generated capability spec.

## Phase 4: Conflict Detection

Delegate spec scanning to a **`budget-explorer`** subagent (lookup task, ≤10 tool calls).

When there is no usable intent context, use this existing diff-only prompt unchanged:

> You have the following diff in context:
> ```
> {paste full diff here}
> ```
> **Goal:** Identify all specs in `openspec/specs/*/spec.md` whose requirements overlap with this diff — specs the diff modifies, replaces, or extends.
> **Output contract:** For each conflict, return exactly `path`, `what_would_change` (≤30 words), `why` (≤20 words). No prose. No raw file contents. If no conflicts, return an empty list.

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

If conflicts are found, surface the report, then ask for the decision — except when `fast_track_active` is true: carry the report verbatim in your returned payload content and continue to Phase 5 automatically without the decision ask, because the real accept-or-reject decision belongs to archive's delta-spec sync gate.

Carry the report verbatim in your returned payload content:

```
Conflict detected in the following specs:

- `openspec/specs/{spec-name}/spec.md`
  What would change: {description of the specific requirement or scenario that would be updated}
  Why: {reason tied directly to the diff}
```

After the report on the interactive path, return the decision ask as a `needs_input` result: **"Do you want to proceed with these updates, or abort?"** with the two options labeled `proceed (Recommended)` and `abort` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping); a reply that maps to neither option is invalid — re-ask the question and write no files until a valid choice is made. On a harness with no native option-picker, present exactly:

```
Do you want to proceed with these updates, or abort?

- proceed (Recommended) — apply the spec updates described above
- abort — write no files and stop

Reply with proceed or abort.
```

- On a forwarded **abort** answer: return a terminal payload whose summary is exactly `Backfill aborted. No files written.` and stop.
- On a forwarded **proceed** answer: continue to Phase 5.
- If no conflicts are found: carry `No spec conflicts detected. Proceeding.` verbatim in your returned payload content and continue to Phase 5.

Do NOT write any file until this phase completes.

## Phase 5: Change Name Confirmation

Derive the change name using this priority order:
1. If the request body carries an explicit kebab-case identifier, use it as the name; a block-supplied `**Change name**` present at the same time is ignored.
2. Otherwise, when a crystallized block supplied a `**Change name**`: with `fast_track_active` false, propose it as a `needs_input` result: "I'll use `{proposed-name}` as the change name. Is that correct? (yes/no)" with options `yes` / `no`; with `fast_track_active` true, accept it directly with no ask.
3. If no name exists yet but one can be clearly inferred from the diff file paths or interview answers, propose it as a `needs_input` result: "I'll use `{proposed-name}` as the change name. Is that correct? (yes/no)" with options `yes` / `no`.
4. If no name can be derived: return a terminal payload whose summary is exactly `Change name required. Run: /sai-backfill <name>` and stop.

Do NOT compose any draft for a write until the name is confirmed (or fast-track-accepted per rule 2); after confirmation, every subsequent result carries `resolved_change_name`.

## Phase 6: Draft Composition

Only after Phases 1–5 complete with no abort and a confirmed change name, compose the following drafts in order and return their CONTENT as payload text inside your terminal payload. The draft set contains only `.openspec.yaml`, `proposal.md`, and capability specs under the selected change directory. Never compose `design.md`, `tasks.md`, or `implementation.md` — they are prohibited outputs everywhere in this flow.

### 6a. Draft `.openspec.yaml`

For a run with no usable intent context, carry exactly these three keys and no others:

```yaml
schema: sai-workflow
created: {calendar date in YYYY-MM-DD, e.g. 2026-05-21}
backfilled: true
```

For a run with usable intent context, carry exactly these four keys and no others:

```yaml
schema: sai-workflow
created: {calendar date in YYYY-MM-DD, e.g. 2026-05-21}
backfilled: true
prior_intent: true
```

`created` MUST be a date only in `YYYY-MM-DD` form, never a datetime. Do not add `backfilled_at`, `backfilled_from`, a raw statement, parsed intent, or any other companion key.

### 6b. Draft `proposal.md`

Compose the draft of `openspec/changes/{name}/proposal.md`. For a run with no usable intent context, the draft MUST open with this exact blockquote as the very first content before any section heading:

```
> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.
```

For a run with usable intent context, use this exact first line instead:

```
> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.
```

Then follow the standard proposal structure. Derive all content from the selected diff, fixed interview answers, evidence-backed reconciliation results, qualifying preservation confirmations, and scope-drift reports. Describe what was implemented, not an unsupported ideal. Do not copy the raw statement or any parsed-intent serialization into the proposal. Unconfirmed claims, unanswered gaps, rejected alternatives, and omissions remain outside normative requirements; a confirmed deliberate preservation may be described only as an evidence-backed boundary.

The proposal MUST contain these headings in this order: `## Why`, `## What Changes`, `## Capabilities`, `### New Capabilities`, `### Modified Capabilities`, and `## Impact`. Fill `Why` from the first fixed answer and the diff. Fill `What Changes` with the implemented file and behavior changes, including evidenced scope drift only as implemented behavior. List each diff-backed new or modified capability under the corresponding capability subsection. Under `## Impact`, list concrete new and modified files and end with `Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill`. Do not leave instructional text, template markers, or unresolved placeholders in the written proposal.

### 6c. Draft capability specs

For each distinct capability evidenced in the diff, compose the draft of `openspec/changes/{name}/specs/{capability}/spec.md`.

Use the standard sai-workflow delta format:
- New behavior → `## ADDED Requirements` section
- Changed behavior → `## MODIFIED Requirements` section
- Removed behavior → `## REMOVED Requirements` section

Each requirement MUST use a concrete `### Requirement:` heading with SHALL or MUST normative language, followed by optional concrete scope prose and at least one `#### Scenario:` block containing exactly one `- **WHEN**` line and one `- **THEN**` line. Write only behavior from the diff, fixed answers, or qualifying preservation evidence. Do not leave instructional text or unresolved placeholders in a draft. Do not turn unconfirmed intent, an unanswered gap, a rejected alternative, or an omission into a normative requirement. Do not draft an update to a spec flagged in Phase 4 unless the user confirmed **proceed** in that phase.

## Completion Boundary

On the ordinary route, after all draft artifact content has been returned for
write, stop. Do not create any planning artifact, run another SAI command, or
invoke an archive command from this flow. The coordinator validates the drafts
against `openspec/schemas/sai-workflow/schema.yaml` and executes the final
writes into `openspec/changes/{name}/`; the worker run closes once the drafts
are handed over.

On the Build (unattended) route, the prepare stretch still closes after the draft
handoff, but the same worker may be resumed exactly once with
`--autofast-execute` after coordinator validation and authorization. That
continuation writes only the exact validated draft set and then closes; it does
not compose new content, invoke another SAI command, or invoke archive.
