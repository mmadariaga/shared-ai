## Why

The closed-choice-prompts rule in `remember.md` still says "GitHub Copilot — no native option-picker", which misroutes VS Code Copilot to plain text even though the `vscode` category (present in every `commands/copilot/*.prompt.md` frontmatter) now grants the `vscode/askQuestions` picker. The rule also frames picker vs plain text as co-equal alternatives, which lets the model intermittently drift to plain text on harnesses that have a picker.

## What Changes

- Strengthen the closed-choice-prompts rule so the harness option-picker is the **explicit default** and plain text is a **deliberate fallback only**, not a co-equal alternative (imperative voice: "you MUST use the option-picker").
- Split the GitHub Copilot per-harness sub-clause into two surfaces:
  - **VS Code Copilot** — uses `vscode/askQuestions` (granted via the `vscode` category on every `commands/copilot/*.prompt.md`).
  - **Other Copilot surfaces (CLI, web)** — still no native option-picker; plain-text fallback.
- Preserve verbatim: Claude Code / opencode tool names, the semantics-preservation clause, and the full-word label-vocabulary rule.
- This change edits `sai/instructions/remember.md` (the production rule) and the corresponding `closed-choice-prompts` capability spec, which today carries the same outdated "no native option-picker" Copilot mapping and matching plain-text scenario.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `closed-choice-prompts`: the per-harness option-picker mapping splits GitHub Copilot into VS Code (has `vscode/askQuestions`) vs other surfaces (no picker); the requirement text makes the picker the default channel and plain text a deliberate fallback.

## Impact

- `sai/instructions/remember.md` — the closed-choice-prompts bullet (production rule fetched by every `sai-*` command). ~+50 tokens per `sai-*` invocation.
- `openspec/specs/closed-choice-prompts/spec.md` — first requirement's per-harness mapping and its Copilot scenario (applied at archive time from the delta in this change).
- No changes to `commands/copilot/*.prompt.md` — the `vscode/askQuestions` wiring already exists (change `2026-07-15-wire-copilot-prompt-tools` / capability `copilot-prompt-tools`). This change only documents that wiring in the rule.
- No changes to per-instruction closed-choice prompts (`commit.md`, `design.md`, `backfill.md`, `archive.md`, `explore.md`, `artifact-feedback-gate.md`, `sai-2-design.md`) — they keep referencing the centralized rule.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/remember.md` — current closed-choice-prompts rule (bullet 9/9).
- `openspec/specs/closed-choice-prompts/spec.md` — existing capability spec (the task assumed none existed; it does).
- `openspec/specs/copilot-prompt-tools/spec.md` — confirms the `vscode` category grants `vscode/askQuestions` on all 14 prompt files and asserts the picker is "universal per remember.md".
- `commands/copilot/sai-1-spec.prompt.md` — sample frontmatter (`tools: [vscode, read, search, edit, execute, web]`).

**External URLs**: <!-- none -->

## Additional Notes

- **Task premise correction**: the task text stated closed-choice-prompts is "currently rule-only (no openspec/specs/closed-choice-prompts/spec.md)". The spec exists, so this is a MODIFIED delta, not a materialized new spec.
- **Pre-existing cross-spec inconsistency this change resolves**: `copilot-prompt-tools/spec.md:19` already asserts "the closed-choice option-picker (`vscode/askQuestions`) is universal per `remember.md`" (grounded on the category-expansion rule at `copilot-prompt-tools/spec.md:5`), while remember.md and closed-choice-prompts/spec.md currently say Copilot has no picker. Updating the rule and its spec brings all three into agreement.
- **Label-vocabulary rule is already spec-backed, and stays out of this delta**: the "Option labels MUST be full words, not abbreviations" requirement already exists as its own requirement (with scenarios) in the base spec `openspec/specs/closed-choice-prompts/spec.md`. This delta MODIFIES only the "native option-picker" requirement; the label-vocabulary requirement is intentionally untouched (OpenSpec deltas reproduce only the requirements they change), so it remains normative without being restated here.
- The remember.md header/lead-in salience wording (imperative voice) is a rule-file phrasing change; the normative contract is that the picker is the required channel where one exists and plain text is the fallback.
