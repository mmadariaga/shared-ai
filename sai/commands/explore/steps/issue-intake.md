# Issue intake

An **issue** is any issue, bug, or ticket whose content is in the conversation, whatever its source: imported, pasted, read from a file, or passed as the `/sai-explore` argument. All sources follow this one intake, and it names no skill. Hidden markers and HTML comments in the issue never carry block content.

**Trigger.** Intake starts on text in issue format (a description with the headings `## Problem`, `## Goal`, `## Scope`, `## Non-goals`, `## Open questions`, and `## Maturity`) or on an explicit user statement that the text is an issue. A link is ordinary content and triggers nothing. Any other text enters through the direct-looking request rule in `sai/commands/explore/instructions.md`.

**Work question.** Ask it once the issue's complete content is in the conversation; it closes that turn. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the issue summarized in the ambient conversation language before the picker and the question following `@sai/policies/question-context.md`. Two options, in this order:

- `work` — work on this issue.
- `context` — keep the issue as context only.

- **Several unrelated issues** in one message: the question lists them all, one `work` option per issue plus `context`, falling back to numbered plain text beyond the harness picker capacity. The user picks at most one to work on; the rest stay as context.
- **Intent already stated.** A message that states the intent to work on the issue while bringing it (for example, "let's tackle this issue") answers the question with `work`; ask nothing.
- **Ready to Propose form.** When the issue's `Maturity` section reads `Ready to propose`, the question also shows the `Change name` proposed from the issue's `Goal` (kebab-case). The user corrects it through the free-text answer.
- `--fast-track` skips nothing here: the question is always asked of the user.

**On `work`**, in the same turn and with no separate activation turn:

1. The issue becomes the candidate idea, with its stated content as the idea's starting content, and `Explore change` begins as for any candidate idea (Closure State, stage TODO). An incoming issue is a candidate idea with pre-agreed content, never an order to implement; ask only the unresolved substantive questions.
2. The issue's `E#` list (Edge cases) and `I#` list (Implementation notes) are carried as the starting lists of `Review edge cases` and `Implementation details`, numbered consecutively as `E1..En` and `I1..In`. At each stage Explore presents the starting list and may propose additional items that come from that stage's checks. Agreement and advancement follow **List stages** in `steps/common.md` unchanged.
3. When the issue has related issues, Explore may explore them to enrich context. The work stays limited to the issue mentioned first.

**On `context`**, no candidate idea exists: the issue informs the conversation, and the next input is classified as usual.
