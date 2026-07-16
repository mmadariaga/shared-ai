## MODIFIED Requirements

### Requirement: Closed-choice prompts MUST use the harness's native option-picker when available

The SAI pipeline presents many closed-choice prompts to the user (yes/no questions, numbered lists, commit authorization gates, change pickers). Whenever a `sai-*` command asks the user to pick from a closed set of options, the harness's native option-picker tool is the default channel and MUST be used whenever one exists; plain text is a deliberate fallback used only on surfaces that have no native option-picker, never a co-equal alternative on surfaces that do. Presentation changes per harness; question text, option semantics, retry rules, decline rules, and "wait for the answer" requirements stay exactly as the defining instruction specifies.

The per-harness mapping is:

    - Claude Code — use the `AskUserQuestion` tool (one clickable option per choice; a free-text "Other" is appended automatically by the harness).
    - opencode — use the `question` tool (one option per choice under `options`; single-select by default).
    - GitHub Copilot (VS Code) — use the `vscode/askQuestions` tool, granted via the `vscode` category present in every `commands/copilot/*.prompt.md` frontmatter (one option per choice).
    - GitHub Copilot (other surfaces: CLI, web) — no native option-picker; print the question and options as plain text and wait for a typed reply.

A free-text reply that does not map to a listed option follows that instruction's invalid-input rule (typically "reject and re-prompt" for picker prompts, "treat as decline" for yes/no gates).

#### Scenario: Claude Code — yes/no commit gate
- **WHEN** `sai-4-apply` reaches a STOP & COMMIT marker on Claude Code
- **THEN** the coordinator presents the commit authorization question through `AskUserQuestion` with two clickable options labeled `yes` and `no`, and commits only when the user selects `yes`

#### Scenario: opencode — change picker
- **WHEN** `openspec list --json` returns two or more active changes and the consuming `sai-*` command runs on opencode
- **THEN** the change-picker presents one option per change name through the `question` tool (single-select), and a selection resolves to the matching change name

#### Scenario: GitHub Copilot in VS Code — change picker uses the native picker
- **WHEN** the change-picker scenario runs on GitHub Copilot inside VS Code
- **THEN** the command presents one option per change name through the `vscode/askQuestions` tool rather than plain text, because the `vscode` category on the prompt file grants that tool; the selection semantics are identical to the other option-picker presentations

#### Scenario: GitHub Copilot on a non-VS-Code surface — plain-text fallback
- **WHEN** the same change-picker scenario runs on a GitHub Copilot surface with no native option-picker (CLI, web)
- **THEN** the command prints the question and a 1-indexed numbered list of change names as plain text and waits for a typed reply; the selection semantics are identical to the option-picker presentation

#### Scenario: Plain-text fallback — reply maps to no listed option
- **WHEN** the user replies to a plain-text closed-choice prompt (non-VS-Code Copilot surface) with free text that maps to none of the listed options
- **THEN** the command applies the defining instruction's invalid-input rule ("reject and re-prompt" for picker-style prompts, "treat as decline" for yes/no gates) rather than guessing an option, exactly as it would on a native-picker harness

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
