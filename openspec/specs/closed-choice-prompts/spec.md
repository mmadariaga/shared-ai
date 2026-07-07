## ADDED Requirements

### Requirement: Closed-choice prompts MUST use the harness's native option-picker when available

The SAI pipeline presents many closed-choice prompts to the user (yes/no questions, numbered lists, commit authorization gates, change pickers). Whenever a `sai-*` command asks the user to pick from a closed set of options, it MUST present the choices through the harness's native option-picker tool when one exists, and MUST fall back to plain text when it does not. Presentation changes per harness; question text, option semantics, retry rules, decline rules, and "wait for the answer" requirements stay exactly as the defining instruction specifies.

The per-harness mapping is:

    - Claude Code — use the `AskUserQuestion` tool (one clickable option per choice; a free-text "Other" is appended automatically by the harness).
    - opencode — use the `question` tool (one option per choice under `options`; single-select by default).
    - GitHub Copilot — no native option-picker; print the question and options as plain text and wait for a typed reply.

A free-text reply that does not map to a listed option follows that instruction's invalid-input rule (typically "reject and re-prompt" for picker prompts, "treat as decline" for yes/no gates).

#### Scenario: Claude Code — yes/no commit gate
- **WHEN** `sai-4-apply` reaches a STOP & COMMIT marker on Claude Code
- **THEN** the coordinator presents the commit authorization question through `AskUserQuestion` with two clickable options labeled `yes` and `no`, and commits only when the user selects `yes`

#### Scenario: opencode — change picker
- **WHEN** `openspec list --json` returns two or more active changes and the consuming `sai-*` command runs on opencode
- **THEN** the change-picker presents one option per change name through the `question` tool (single-select), and a selection resolves to the matching change name

#### Scenario: GitHub Copilot — plain-text fallback
- **WHEN** the same change-picker scenario runs on GitHub Copilot
- **THEN** the command prints the question and a 1-indexed numbered list of change names as plain text and waits for a typed reply; the selection semantics are identical to the option-picker presentation

### Requirement: Option labels MUST be full words, not abbreviations

When presenting closed-choice prompts, the agent MUST use full words for option labels (`yes` / `no`, not `y` / `n`). Full words are legible in plain-text fallbacks and carry no character penalty in clickable options. Two-letter and one-letter abbreviations are prohibited.

#### Scenario: Commit gate on a plain-text harness
- **WHEN** a `sai-*` command presents a commit authorization question on GitHub Copilot
- **THEN** the printed question and options read `yes` and `no` (not `y` and `n`), and a user-typed `y` follows the instruction's invalid-input rule rather than being auto-accepted

#### Scenario: Two-letter option label is rejected
- **WHEN** a `sai-*` instruction drafts a new yes/no prompt
- **THEN** the prompt's option labels read `yes` and `no`; the previous `(y/n)` style is not used in newly written prompts

### Requirement: Closed-choice prompt rule is centralized in remember.md

The closed-choice prompt rule MUST live in exactly one place: `sai/instructions/remember.md`. Every `sai-*` instruction that asks a closed-choice question MUST reference that rule (e.g. "per the 'Closed-choice prompts' rule in `remember.md`, which gives the per-harness option-picker mapping") rather than re-stating the per-harness mapping inline.

#### Scenario: A new sai-* instruction needs a closed-choice prompt
- **WHEN** an author writes a new instruction that asks the user a yes/no or numbered-list question
- **THEN** the instruction references the centralized rule in `remember.md` and does not duplicate the per-harness option-picker mapping

#### Scenario: remember.md is the single source of truth
- **WHEN** the per-harness option-picker mapping needs to be updated (e.g. a new harness is supported, or a harness gains a native option-picker)
- **THEN** the change is made in `sai/instructions/remember.md` only, and every instruction that references the rule picks up the change without being edited
