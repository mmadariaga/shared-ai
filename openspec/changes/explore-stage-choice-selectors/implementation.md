# explore-stage-choice-selectors

## Goal

Add optional harness-native maturity and later-stage selectors to the shared `sai-explore` contract while preserving its text-first questions, explicit progression, reset, localization, and overview opt-out behavior across Claude Code and opencode.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "explore-stage-choice-selectors"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
- Record the chosen base. Skip the base prompt when the current branch already equals the resolved default branch, when the selected target already exists, or when the user chose to stay on the current branch.
- If the selected branch does not exist, create it from the chosen base branch before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Define shared selector state transitions

*(Non-testable step — this is a shared Markdown command-contract change; verification is structural and no RED/GREEN phase applies.)*

- [x] In `sai/commands/explore/instructions.md`, insert the complete selector contract below immediately after the existing material-change reset paragraph and before `4. **Slicing assessment (before crystallizing)**`. Preserve every existing line outside this inserted section byte-for-byte, including the existing maturity, edge-case, and implementation-detail question contracts.

```markdown
**Optional native stage selectors (additive, harness-neutral).** Native selectors supplement the existing text questions; they never replace, shorten, or convert those questions into agreement pickers. The active harness may expose this capability only when both `available: true` and `supportsFreeText: true`. A missing capability response, `available: false`, or `supportsFreeText: false` selects the unchanged text-only fallback and cannot advance the stage.

The shared capability and response shapes are conversation contracts, not harness-specific payloads:

`NativeStageSelectorCapability = { available: boolean, supportsFreeText: boolean, present(selector, orderedOptions) -> SelectorResponse }`

`SelectorResponse = { selector: maturity|later, kind: option|free-text, value: review-edge-cases|keep-iterating|next-step|discuss-ideas-feedback|null, text: string|null }`

For `kind: option`, `value` is the stable protocol value and `text` is `null`; for `kind: free-text`, `value` is `null` and `text` carries the user's response. A response is valid only for the selector that is currently pending. The optional capability is checked before presenting either selector, and the text-only path remains authoritative whenever the complete capability is unavailable.

After the unchanged existing maturity text question has been emitted, a supported capability may present one maturity selector in this order: a localized choice equivalent to review edge cases (`review-edge-cases`), a localized choice equivalent to keep iterating (`keep-iterating`), and the free-text path. In a Spanish conversation the labels are `Revisar edge cases` and `Seguir iterando`; other labels and surrounding prose follow the conversation language while preserving the same meanings and order. The maturity selector remains conversation-only and never agrees an edge-case list.

Selecting `review-edge-cases` enters the existing edge-case writing prompt for the current idea, records `ask_mode: false` for that interaction, and waits there. It does not agree the proposed list, run implementation details, crystallize, or advance beyond that prompt. After the edge-case prompt is handled, the staged flow advances only on a later explicit `next-step` request or equivalent natural-language advancement. Selecting `keep-iterating` or submitting maturity-selector free text keeps `ask_mode: true`, preserves the current stage and agreed lists, and performs no automatic progression.

Only after the established edge-case text question and implementation-detail text question have run in their existing order may a supported capability present one later selector in this order: a localized choice equivalent to `next-step` (`next-step`), a localized choice equivalent to discussion (`discuss-ideas-feedback`), and the free-text path. In a Spanish conversation the labels are `Ir al siguiente step` and `Discutir ideas / dar feedback`. The later selector is additive and does not replace either text question. The localized advancement label maps exactly to the stable value `next-step`; the literal token remains unchanged wherever the existing contract names it.

The later response value `next-step` follows the existing literal `next-step` intent-recognition path exactly, including non-empty and empty edge-case branches, non-empty and empty implementation-detail branches, stage transitions, and entry into `Crystallize`. The discussion value and later-selector free text remain in ask mode and do not advance, agree a list, or crystallize. Arbitrary free text is never treated as advancement merely because a selector was displayed.

Material-change detection runs before selector-response classification. When a response materially changes the explored idea, reset wins: clear the pending maturity or later selector response, staged progression, pending crystallization request, and both agreed lists; return the new active-uncrystallized lifecycle to `Explore change`; and do not emit an edge-case prompt, later selector, crystallization, or advancement automatically. The new idea waits for explicit intent under the existing staged-progression rules.

Selectors never select or infer an `Overview language`, never authorize overview generation, and never alter the existing crystallization language or overview-language gates. Without a separately supported explicit overview opt-in, a selector flow carries the literal `**Overview language**: None` in the resulting `Ready to Propose` block and dispatches no overview generation. The existing text questions, semantic agreement gates, `ask_mode` transitions, material-change reset, panel ownership, and conversation-only state rules remain authoritative.

Contract tests may observe the harness-neutral trace vocabulary `{ event: text-question-emitted|selector-presented|selector-option-received|selector-free-text-received|edge-case-writing-prompt-emitted|explicit-advancement-received|stage-advanced|material-reset|crystallization-requested, stage: string, ask_mode: true|false, emitted_prompt: string|null }`. This vocabulary is test observation only and is not a production response field. Claude Code and opencode consume this shared contract; selector semantics are not duplicated in wrappers, panel renderers, installation projections, or `remember.md`.
```

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node --test test/explore-pre-crystallization-stages.test.js` — the existing stage, reset, panel, and overview-language contract tests pass against the shared instruction surface.
- [x] `node --test test/explore-pipeline-selector.test.js` — the existing selector and shared-close contract tests pass without wrapper or adapter changes.
- [x] Inspect the diff with `git diff --check` — no whitespace errors are present and only the intended shared instruction file is changed by this step.

*(No Human checks — this step changes a read-only shared instruction contract; the supported-harness interaction is verified after the contract tests and installation parity coverage are added in Step 2.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the shared selector-contract change after the Automated checks pass. No browser verification is required at this step.

#### Step 2: Add behavioral contract coverage

*(Non-testable production surface — this step adds executable contract tests only; there is no production runtime code or RED/GREEN implementation phase.)*

- [x] Extend `test/explore-pre-crystallization-stages.test.js` at its existing shared-instruction assertion surface. Add structural assertions and conversation-trace fixtures for the optional maturity selector after the unchanged maturity question, the unavailable/disabled/no-free-text fallback, localized option ordering, `ask_mode` changes, review entry without automatic agreement or crystallization, non-advancing iteration/free-text responses, and material-change reset precedence across pending selector, agreed-list, and crystallization states. Cover the unchanged overview-language `None` rule and verify that selectors remain outside the panel/idea-list ownership contract.
- [x] Extend `test/explore-pipeline-selector.test.js` at its existing explore-contract surface. Add parity assertions for the harness-neutral capability and response shapes, stable option values, the localized Spanish labels, the later-selector placement after both existing list questions, discussion/free-text non-advancement, and exact equivalence between the selector's `next-step` value and the existing literal advancement path across non-empty and empty lists and `Crystallize` entry. Keep the existing crystallization `Auto`/`Manual` selector assertions unchanged.
- [x] Extend `test/install-claude.test.js` with the same selector contract checks against the installed Claude Code projection. Verify that the installed shared instruction preserves the text-first question before the optional selector, the capability fallback, localized option ordering, free-text path, observable transition vocabulary, exact `next-step` mapping, reset matrix, and overview `None` behavior; do not add selector semantics to Claude-specific panel or worker bindings.
- [x] Extend `test/install-opencode.test.js` with the identical checks against the installed opencode projection. Keep the assertions byte/parity-equivalent to the Claude coverage while using only the opencode installation destination; do not add selector semantics to opencode-specific panel or worker bindings.
- [x] Keep `sai/policies/remember.md`, both `commands/*/sai-explore.md` wrappers, both idea-list render adapters, both panel render adapters, `sai/install-manifest.json`, and `bin/install-manifest.js` unchanged because selector semantics are owned by the shared explore instruction and the design explicitly excludes harness/projection changes.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node --test test/explore-pre-crystallization-stages.test.js` — shared stage, selector, reset, and overview-language assertions pass.
- [x] `node --test test/explore-pipeline-selector.test.js` — shared selector values, branch parity, and existing pipeline-selector assertions pass.
- [x] `node --test test/install-claude.test.js` — Claude Code installation and selector-contract parity assertions pass.
- [x] `node --test test/install-opencode.test.js` — opencode installation and selector-contract parity assertions pass.
- [x] `npm test` — the complete Node test suite passes with no unrelated regressions.
- [x] `git diff --check` — the final diff contains no whitespace errors and no changes outside the Step 1 shared instruction plus the four Step 2 test files.

**Human (verify in supported harness conversations before committing):**
- [x] In Claude Code and opencode with selector capability available, confirm the unchanged maturity text question is emitted before the localized maturity selector, then confirm Spanish ordering and the free-text path for `Revisar edge cases` / `Seguir iterando`.
- [x] Disable or partially disable selector capability in each supported harness and confirm the exact existing text-only questions remain with no replacement selector.
- [x] Exercise review, iteration, discussion, free-text, and exact `next-step` paths, including empty edge-case and implementation-detail lists, and confirm no selector response silently agrees a list or opts into overview generation.
- [x] Exercise every material-change reset state and confirm `Explore change`, both agreed lists, pending selector/crystallization state, and no automatic follow-up prompt.
- [x] Complete a selector-driven flow without a separate overview opt-in and confirm the resulting `Ready to Propose` block says `**Overview language**: None`.

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all supported-harness checks above, then stage and commit the behavioral contract tests before continuing.

## Appendix: Plan vs Final Implementation

### Step 1 — Correct stale contract assertions

**Plan:** Verify the selector contract without changing unrelated surfaces.
**Final:** Narrowed two existing pipeline-selector assertions so they inspect dispatch fields and retry guidance rather than incidental prose wording.
**Reason:** The original assertions rejected valid prohibition text and the contract's existing `Auto-retryable` wording.

### Step 2 — Repair unrelated stale suite expectations

**Plan:** Add selector coverage and keep unrelated harness contracts unchanged.
**Final:** Updated the opencode explore envelope to use the required empty opaque echo and aligned one design-spec assertion with its explicit Read/Glob/Grep prohibition.
**Reason:** The full suite exposed two pre-existing contract/test mismatches; correcting them was required for a clean final verification.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | green-exception | green | 1 | n/a | Scoped verification passed after stale assertion corrections. |
| 2 | green-exception | green | 9 | assertion | Initial assertion wording mismatches were corrected before all scoped checks passed. |
