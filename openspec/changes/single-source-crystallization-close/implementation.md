# single-source-crystallization-close

## Goal

Define one authoritative crystallization-turn close in explore instructions, exclude phase-navigation-only questions from the genuine-question branch, plain-fold the three complete change-local deltas into main specs, and pin the contract with lexical tests.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "single-source-crystallization-close"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Single-source crystallization-turn close in explore instructions

*(Instruction-only / non-UI step — standard format, no RED/GREEN. Decision records ADR 0158 and DDR 0151 already exist from planning.)*

- [x] Open `sai/commands/explore/instructions.md`. Locate the pre-crystallization closure block (ends just before item `5. **Crystallization protocol (single change)**`). **Do not move** the staged-progression or pre-crystallization material between item 4 and item 5.

- [x] Insert the following authoritative shared-close subsection **immediately above** the existing item-5 heading (`5. **Crystallization protocol (single change)**`), as the sole full statement of the crystallization-turn emission sequence:

```markdown
**Crystallization-turn close (shared):** After the handoff block(s) and any existing next-step wording for this path, close the crystallization turn exactly once with this sequence — the sole full statement of the close; items 5, 6, and 7 invoke it by reference and MUST NOT restate the emission sequence:

1. One keep-window-open recommendation outside the handoff block: plain conversational free-text prose rendered in the user's language per item 8 / `sai/policies/remember.md` (only the recommendation is localized — `Ready to Propose` scaffolding and next-step command lines stay English). It tells the user to keep this explore window open and return to it to review and refine the artifacts that `/sai-1-spec` and `/sai-2-design` create next (per the `explore-crystallization-block` capability). It replaces the removed auto-fired review picker (item 9) as the thing that closes the crystallization turn before the selector. The recommendation names the literal token `review-loop` exactly once for the user-triggered review loop; the token is never presented through a picker and is never auto-started or auto-offered. The recommendation names no pipeline token. `review-loop` remains a standing user-triggered path while the selector (item 10) governs only delegated execution.
2. After that recommendation, emit the crystallization-close pipeline selector (item 10) exactly once as the **final** emission of this slice's turn.

Selecting **Manual**, or giving an answer that maps to neither selector option, refers to this already-emitted recommendation and MUST NOT re-emit a second recommendation or selector. Item 10 describes that branch by reference to this shared rule. The separate next-step instruction (including `Open a new chat and run /sai-1-spec` and the sliced first-block instruction) remains in its existing pre-selector position in this slice.
```

- [x] Replace item 5's post-block close paragraph (the paragraph that begins `After printing the block, close the crystallization turn with one plain, user-language recommendation...` and ends with `emit the crystallization-close pipeline selector (item 10) exactly once as the final step of the turn.`) with a short reference that preserves Idea Progress List hooks and next-step position:

```markdown
   After printing the block, keep the existing `Open a new chat` / `/sai-1-spec` next-step instruction after the `---` separator and before the close sequence. Then apply the **Crystallization-turn close (shared)** above (recommendation naming `review-loop` exactly once, then item 10 selector as final emission). Do not restate the full recommendation → selector sequence here.
```

- [x] In item 6, replace the post-final-slice close wording (from `After the final slice block, close the crystallization turn **once** with the same keep-window-open recommendation as item 5...` through `emit the crystallization-close pipeline selector (item 10) exactly once as the final step of the turn, after the last slice block.`) while preserving slice-0 / Walking Skeleton / first-block instruction text earlier in the item. Use:

```markdown
After the final slice block only, apply the **Crystallization-turn close (shared)** above once for the whole slice set (recommendation naming `review-loop` exactly once, then item 10 selector as final emission). Do not emit the recommendation or selector for an earlier slice. Preserve the existing instruction to take the first block to a new chat with `/sai-1-spec` in its pre-selector position. Do not restate the full recommendation → selector sequence here. Routed supervision remains available on Claude Code and opencode.
```

- [x] Replace item 7's closing clause so it references the shared close without restating the full sequence. Keep the decline sentence and paste-ready block(s) emission. Final item 7 body:

```markdown
7. **Inline proposal refusal**: If the user asks to create a proposal or run `/sai-1-spec` now, evaluate the crystallization language gate (item 8) and the overview-language gate (gate 9, item 8), in that order, then decline with: "Creating a proposal opens a new context. The paste-ready block follows — copy it and start a new chat with `/sai-1-spec` to keep the spec session clean." Then print the paste-ready block(s) and apply the **Crystallization-turn close (shared)** above — an inline refusal is a crystallization emission and closes exactly like items 5 and 6. Do not restate the full recommendation → selector sequence here. No post-`Manual` relocation or new in-session proposal dispatch is introduced.
```

- [x] Align item 9's opening so it does not restate a competing close sequence. Keep token-path / semantic-path / Review Engine content. Replace only the first sentence cluster that currently says the crystallization turn closes by recommending keep-window-open and then emitting the selector. Use wording equivalent to:

```markdown
9. **Post-crystallization review loop (sai-explore only)**: The review is **not** auto-offered at crystallization. The crystallization turn closes via the **Crystallization-turn close (shared)** (items 5/6/7) and the crystallization-close pipeline selector (item 10). That selector is a two-option **Auto** / **Manual** choice over delegated pipeline execution only — it is **not** the removed global Yes/No review picker, it never offers, starts, or substitutes for this review loop, and this review loop stays picker-free at crystallization. Treat the review as a **user-triggered standing invitation** with two entry paths: the **token path** — the user fires the literal token `review-loop`, which enters the per-change loop directly (see **Token trigger** below) — and the **semantic path** — the user accepts that standing invitation in natural language, or asks to review the downstream artifacts of the changes crystallized in this chat.
```

- [x] Rewrite item 10's Manual/unmapped branch so it refers to the already-emitted recommendation and does not re-emit recommendation or selector. Leave Auto dispatch, state keys, multi-change picker, retry-without-cap, and `--fast-track` non-suppression intact. Replace the sentences that currently say Manual "closes the turn with the keep-window-open recommendation naming `review-loop`" and unmapped free text "the reminder is printed" with:

```markdown
Selecting **Manual** dispatches nothing, changes no state value, injects no `--supervised`, `--fast-track`, or `--overview-lang` marker from the supervised path, and refers to the one keep-window-open recommendation already emitted by the **Crystallization-turn close (shared)** before the selector (naming `review-loop` exactly once). It MUST NOT emit a second recommendation or selector for the same answer. A free-text answer that maps to neither option is treated as **Manual**: nothing is dispatched, no supervision state is changed, and no second recommendation or selector is emitted. **Manual is not terminal** — re-emit the selector whenever the user asks for it (a turn whose dominant intent is to run the supervised pipeline or to see the selector again; no token form exists and none is recognized), with no cap on re-emissions. `--fast-track` auto-selects nothing: the selector is always asked, and it is the one gate to delegated writes that fast-track never skips.
```

- [ ] Preserve pinned literals and payload boundary: `review-loop` remains verbatim; `Ready to Propose` / `---` block scaffolding unchanged; Auto success still emits no next-step/implement handoff; no edits to wrappers, body, launcher, or adapters.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] Confirm `sai/commands/explore/instructions.md` contains exactly one `**Crystallization-turn close (shared):**` heading (or equivalent sole full-statement subsection) immediately above item 5.
- [x] Confirm items 5, 6, and 7 reference that shared close and do not restate the full recommendation → selector sequence.
- [x] Confirm item 10 Manual/unmapped text does not instruct emitting a second recommendation or selector.
- [x] Confirm item 9 does not restate a competing full close sequence and still treats `review-loop` as a standing user-triggered path.
- [x] Confirm `Ready to Propose` template and `---` separator are unchanged.
- [ ] Note: existing pins in `test/explore-pipeline-selector.test.js` that require Manual to "close with the keep-window-open recommendation" will fail until Step 4 rewrites them — that is expected.

*(No Human checks — service-side instruction edit with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Phase-navigation disqualifier in pre-crystallization closure

*(Instruction-only / non-UI step — standard format, no RED/GREEN.)*

- [x] In `sai/commands/explore/instructions.md`, edit only the pre-crystallization genuine-question / stage-aware-reminder rule (the bullet under **Pre-crystallization closure** that begins `On every successful turn while the state is `active-uncrystallized`...`). Do **not** edit the shared close or items 5/6/7/9/10 in this step.

- [x] Insert the phase-navigation disqualifier so the genuine-question branch excludes navigation-only questions. Replace the two sentences:

  - `When a genuine unresolved question remains and its answer could change the idea, end with that relevant question and do not append a reminder. When no genuine unresolved question remains, end with this concise reminder selected from the current stage.`

  with:

```markdown
When a genuine unresolved question remains and its answer could change the idea, end with that relevant question and do not append a reminder. A question whose dominant purpose is only to navigate the exploration stages — for example, asking whether to use `next-step` or whether to move to the next phase without raising substantive uncertainty about the idea — does NOT count as a genuine unresolved question; fall through to the stage-aware reminder. A question that contains substantive uncertainty capable of changing the idea remains a genuine unresolved question even when navigation wording is also present. When no genuine unresolved question remains, including when the only apparent question is phase navigation, end with this concise reminder selected from the current stage.
```

- [x] Preserve the existing stage-1/2 `next-step` naming, stage-3 dual-token reminder, and the exact literal: `Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec``.
- [x] At stage 4 completion wording, if it still says the response ends only with the `Ready to Propose` block, extend it to `Ready to Propose` block(s) followed by the shared crystallization-turn close (behavior-preserving alignment with the shared close; do not invent new emissions).

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] Confirm the pre-crystallization closure section contains the phase-navigation disqualifier (dominant purpose / navigate / fall through to stage-aware reminder).
- [x] Confirm substantive-uncertainty-despite-navigation wording is present.
- [x] Confirm the crystallize readiness literal remains byte-identical where required: `Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec``.
- [x] Confirm items 5/6/7/9/10 and the shared close subsection were not regressively rewritten in this step.

*(No Human checks — service-side instruction edit with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | green-direct | green | 2 | other | Corrected the shared-close wording after coordinator validation failed. |
| 2 | green-direct | green | 1 | n/a | Completed without recovery. |
| 3 | green-exception | green | 1 | n/a | Completed without recovery. |

#### Step 3: Plain-fold main capability specs from complete change-local deltas

*(Declarative OpenSpec fold — non-UI, no RED/GREEN.)*

- [x] Replace the main-spec requirement body for **Close crystallization with selector** in `openspec/specs/explore-crystallization-block/spec.md` with the complete MODIFIED requirement text from `openspec/changes/single-source-crystallization-close/specs/explore-crystallization-block/spec.md` (the entire `### Requirement: Close crystallization with selector` section including all scenarios). Keep the main file's `#` title, `## Purpose`, and all **other** requirements untouched.

- [x] Ensure the folded requirement still contains both fragile guarantees as complete replacement text:
  1. Plain conversational localization with the exact phrase `both literal tokens remain verbatim`
  2. `review-loop` remains a standing user-triggered path while the selector governs only delegated execution

- [x] In `openspec/specs/explore-pipeline-selector/spec.md`, plain-replace each matching MODIFIED requirement from `openspec/changes/single-source-crystallization-close/specs/explore-pipeline-selector/spec.md`:
  - `### Requirement: Emit the crystallization-close selector` (and scenarios)
  - `### Requirement: Authorize Auto dispatch` (and scenarios)
  - `### Requirement: Auto dispatch source is the last crystallization set` (and scenarios)
  - `### Requirement: Define Manual behavior` (and scenarios)

  Leave unrelated main-spec requirements (e.g. Preserve explicit gating, Obsolete token forms, Empty or completed selection set, Active supervision) untouched unless the change-local delta also modifies them (it does not).

- [x] In `openspec/specs/explore-pre-crystallization-closure/spec.md`, plain-replace `### Requirement: Successful active exploration ends with an actionable closure` (full body + all scenarios) with the complete MODIFIED text from `openspec/changes/single-source-crystallization-close/specs/explore-pre-crystallization-closure/spec.md`, including the phase-navigation disqualifier scenarios.

- [x] After the three folds, archive delta-spec sync re-applying the same deltas must be a no-op with respect to the two fragile `explore-crystallization-block` guarantees and the Manual no-re-emission / phase-navigation clauses.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `openspec/specs/explore-crystallization-block/spec.md` contains `both literal tokens remain verbatim`.
- [x] Same file contains standing-path wording: `review-loop` remains a standing user-triggered path while the selector governs only delegated execution (or equivalent complete-delta clause from the change-local file).
- [x] `openspec/specs/explore-pipeline-selector/spec.md` Manual requirement states no second recommendation or selector on Manual/unmapped.
- [x] `openspec/specs/explore-pre-crystallization-closure/spec.md` contains scenario titles `Phase-navigation question falls through to the stage reminder` and `Substantive uncertainty remains despite navigation wording`.
- [x] Unrelated requirements in the three main specs remain present.

*(No Human checks — service-side declarative fold with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Extend lexical tests for shared close, main-spec guarantees, and phase-navigation

*(Lexical contract tests — standard format. Production surfaces already updated in Steps 1–3; this step only rewrites/adds assertions. No separate application runtime.)*

- [ ] Update `test/explore-pipeline-selector.test.js`:

  1. **Rewrite** the existing Manual / unmapped pin that currently requires Manual to close by emitting the keep-window recommendation. Replace it so Manual/unmapped pins assert:
     - Manual dispatches nothing / changes no state
     - refers to the already-emitted recommendation / no second recommendation or selector
     - unmapped free text treated as Manual without re-emission
     - Manual remains non-terminal with no cap on re-emissions
     - `--fast-track` auto-selects nothing

     Concrete rewrite target: the test currently matching `/closes the turn with the keep-window-open recommendation naming `review-loop`/i` (and any sibling assertion that requires a post-answer recommendation emission). New matches must succeed against the Step 1 Manual wording (reference to already-emitted shared close; MUST NOT emit a second recommendation or selector).

  2. **Add** a dedicated shared-close ownership test (or extend an existing crystallization-close test) that asserts against `sai/commands/explore/instructions.md` via the existing `exploreContract()` / `spec(...)` helpers:
     - shared close definition appears once and is placed immediately above item 5 (e.g. match `Crystallization-turn close` / shared close heading and that item `5. **Crystallization protocol` follows it)
     - items 5, 6, and 7 reference the shared close (e.g. match `Crystallization-turn close \(shared\)` or equivalent reference language in those items)
     - recommendation naming `review-loop` exactly once and selector as final emission remain pinned (retain existing compatible pins where still accurate: `names the literal token `review-loop` exactly once`, selector final-step language)
     - items 5/6/7 do not restate the full multi-sentence recommendation body that lived only in the shared definition

  3. **Add** main-spec pins reading `openspec/specs/explore-crystallization-block/spec.md` (use the local `spec()` helper, not change-local deltas alone):
     - file contains the exact phrase `both literal tokens remain verbatim`
     - file contains the standing-path / selector-only delegated-execution clause (match a stable substring such as `/review-loop` remains a standing user-triggered path while the selector governs only delegated execution/` or the closest complete-delta wording after Step 3)

  4. Do **not** delete unrelated supervision / Auto / harness adapter tests in this file.

- [ ] Update `test/explore-pre-crystallization-stages.test.js` **only** for phase-navigation:

  1. **Add** a test that `sai/commands/explore/instructions.md` states navigation-only / phase-navigation questions fall through to the stage-aware reminder (match dominant-purpose / navigate / fall through language from Step 2).
  2. **Add** a test that substantive uncertainty capable of changing the idea remains a genuine unresolved question even when navigation wording is present.
  3. Preserve existing stage-label, `next-step`, Ready-to-Propose ordering, and binding tests.
  4. Do **not** modify `test/change-overview-contract.test.js`.

- [ ] Follow project conventions: assert production instruction and main-spec surfaces; preserve exact pinned phrases; use explicit `node --test` file paths.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] Run `node --test test/explore-pipeline-selector.test.js test/explore-pre-crystallization-stages.test.js` — expected: exit 0, all new and updated assertions pass against Steps 1–3 artifacts.
- [ ] Confirm `test/change-overview-contract.test.js` is unmodified (`git diff -- test/change-overview-contract.test.js` empty for this step's intent).
- [ ] Confirm phase-navigation pins live only in `test/explore-pre-crystallization-stages.test.js` (no duplicate navigation-only case added to `test/explore-pipeline-selector.test.js` or `test/change-overview-contract.test.js`).

*(No Human checks — service-side lexical tests with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.
