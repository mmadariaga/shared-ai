# closed-choice-prompts Specification
## Purpose

Present every closed-choice question through the active harness's native option-picker, with the per-harness mapping and declared picker capacity single-sourced in `sai/policies/remember.md`.

## Requirements
### Requirement: Closed-choice prompts MUST use the harness's native option-picker when available

Whenever a `sai-*` command asks the user to pick from a closed set of options (yes/no questions, numbered lists, commit authorization gates, change pickers), the session that talks to the user SHALL present it through the harness's native option-picker. A worker SHALL return the ask as `needs_input`, and its coordinator SHALL present it. Plain text is a fallback used only on a surface without a native picker or for a set larger than the harness's declared picker capacity, and it SHALL keep every option in its order. Presentation changes per harness; question text, option semantics, retry rules, decline rules, and "wait for the answer" requirements stay exactly as the defining instruction specifies.

The per-harness mapping, with capacity declared rather than inferred from runtime tool behavior, is:

    - Claude Code — the `AskUserQuestion` tool (one clickable option per choice; a free-text "Other" is appended automatically). Picker capacity: 4 options.
    - opencode — the `question` tool (one option per choice under `options`; single-select by default). No cap is declared.

A free-text reply that does not map to a listed option follows that instruction's invalid-input rule (typically "reject and re-prompt" for picker prompts, "treat as decline" for yes/no gates).

#### Scenario: Claude Code — yes/no commit gate
- **WHEN** `sai-4-apply` reaches a STOP & COMMIT marker on Claude Code
- **THEN** the coordinator presents the commit authorization question through `AskUserQuestion` with two clickable options labeled `yes` and `no`, and commits only when the user selects `yes`

#### Scenario: opencode — change picker
- **WHEN** `openspec list --json` returns two or more active changes and the consuming `sai-*` command runs on opencode
- **THEN** the change-picker presents one option per change name through the `question` tool (single-select), and a selection resolves to the matching change name

#### Scenario: Worker ask is presented by its coordinator
- **WHEN** a routed worker needs a closed-choice answer
- **THEN** it returns `needs_input` with the question and options, and the coordinator presents them through the native picker

#### Scenario: Set larger than the declared capacity
- **WHEN** a closed set has five options on Claude Code
- **THEN** the command prints the question and all five options as plain text in their order and applies the defining instruction's invalid-input rule to an unmapped reply

### Requirement: Option labels MUST be full words, not abbreviations

When presenting closed-choice prompts, the agent MUST use full words for option labels (`yes` / `no`, not `y` / `n`). Full words are legible in plain-text fallbacks and carry no character penalty in clickable options.

#### Scenario: Plain-text fallback keeps full-word labels
- **WHEN** a `sai-*` command presents a yes/no question as plain text
- **THEN** the printed options read `yes` and `no` (not `y` and `n`), and a user-typed `y` follows the instruction's invalid-input rule rather than being auto-accepted

#### Scenario: Two-letter option label is rejected
- **WHEN** a `sai-*` instruction drafts a new yes/no prompt
- **THEN** the prompt's option labels read `yes` and `no`; the previous `(y/n)` style is not used in newly written prompts

### Requirement: Closed-choice prompt rule is centralized in remember.md

The closed-choice prompt rule MUST live in exactly one place: `sai/policies/remember.md`. Every `sai-*` instruction that asks a closed-choice question MUST reference that rule (e.g. "per the 'Closed-choice prompts' rule in `remember.md`, which gives the per-harness option-picker mapping") rather than re-stating the per-harness mapping inline.

#### Scenario: A new sai-* instruction needs a closed-choice prompt
- **WHEN** an author writes a new instruction that asks the user a yes/no or numbered-list question
- **THEN** the instruction references the centralized rule in `remember.md` and does not duplicate the per-harness option-picker mapping

#### Scenario: remember.md is the single source of truth
- **WHEN** the per-harness option-picker mapping needs to be updated (e.g. a new harness is supported, or a harness gains a native option-picker)
- **THEN** the change is made in `sai/policies/remember.md` only, and every instruction that references the rule picks up the change without being edited

### Requirement: Conflict decisions use native picker semantics

The language decision and global strategy confirmation SHALL use the active harness-native option picker when available. The coordinator SHALL preserve worker-authored option order and exact values and SHALL reject no listed value by guessing.

#### Scenario: Strategy confirmation uses native picker

- **WHEN** the worker returns the global strategy decision with non-empty options
- **THEN** the coordinator presents `apply-strategy`, `revise-strategy`, and `decline-strategy` through the native picker in that order

#### Scenario: Open revision is not a closed choice

- **WHEN** strategy revision returns a `needs_input` result with an empty `options` list
- **THEN** the coordinator presents ordinary free-form input instead of a native option picker
