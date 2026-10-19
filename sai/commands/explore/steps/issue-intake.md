# Issue intake

Fetch @sai/policies/issue-origin-preservation.md. On `work`, retain the
imported or conversation-verified selected issue URL for block creation and
conversion. Check that the resulting block retains it before storage; use the
validated amendment protocol when a block was already prepared. Context-only
issues and parent links do not become the selected change's origin.

An **issue** is any issue, bug, or ticket whose content is in the conversation, whatever its source: imported, pasted, read from a file, or passed as the `/sai-explore` argument. All sources follow this one intake, and it names no skill. Hidden markers and HTML comments in the issue never carry block content.

**Trigger.** Intake starts on text in issue format (a description with the headings `## Problem`, `## Goal`, `## Scope`, `## Non-goals`, `## Open questions`, and `## Maturity`) or on an explicit user statement that the text is an issue. A link is ordinary content and triggers nothing. Any other text enters through the direct-looking request rule in `sai/commands/explore/instructions.md`.

**Work question.** Ask it once the issue's complete content is in the conversation; it closes that turn. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the issue summarized in the ambient conversation language before the picker and the question following `@sai/policies/question-context.md`. Two options, in this order:

- `work` — work on this issue.
- `context` — keep the issue as context only.

- **Several unrelated issues** in one message: the question lists them all, one `work` option per issue plus `context`, falling back to numbered plain text beyond the harness picker capacity. The user picks at most one to work on; the rest stay as context.
- **Intent already stated.** A message that states the intent to work on the issue while bringing it (for example, "let's tackle this issue") answers the question with `work`; ask nothing.
- **Ready to Propose form.** The issue has the Ready to Propose form when its `Maturity` section reads `Ready to propose`. Read that from the conversion tool's `ready_to_propose_form` (see **Conversion**), never from your own judgment. For such an issue the question also shows the `Change name` proposed from the issue's `Goal` (kebab-case; start from the tool's `proposed_change_name` and reword it only for clarity). The user corrects it through the free-text answer.
- `--fast-track` skips nothing here: the question is always asked of the user.

**On `work`**, in the same turn and with no separate activation turn:

1. The issue becomes the candidate idea, with its stated content as the idea's starting content, and `Explore change` begins as for any candidate idea (Closure State, stage TODO). An incoming issue is a candidate idea with pre-agreed content, never an order to implement; ask only the unresolved substantive questions.
2. The issue's `E#` list (Edge cases) and `I#` list (Implementation notes) are carried as the starting lists of `Review edge cases` and `Implementation details`, numbered consecutively as `E1..En` and `I1..In`. At each stage Explore presents the starting list and may propose additional items that come from that stage's checks. Agreement and advancement follow **List stages** in `steps/common.md` unchanged.
3. When the issue has related issues, Explore may explore them to enrich context. The work stays limited to the issue mentioned first.
4. When the issue has the Ready to Propose form, the **Drift check** follows. Any other issue continues in `Explore change` as for any candidate idea.

**On `context`**, no candidate idea exists: the issue informs the conversation, and the next input is classified as usual. When the user later chooses that issue for work, resume at the drift check if it has the Ready to Propose form, or at `Explore change` otherwise; the work question is not asked again.

## Drift check

Ask it only for an issue with the Ready to Propose form, once `work` is answered. No earlier assessment of the issue replaces it, because an assessment of an empty or open-ended issue validates nothing. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the question following `@sai/policies/question-context.md`. Two options, in this order:

- `validate` — Explore compares the issue's agreed behaviors, constraints, and implementation notes with the current code, read-only, delegating bulk lookups per `sai/policies/remember.md`, and reports each mismatch with its path.
- `declared-clean` — skip validation: the user declares that the issue has no drift.

The outcome is exactly one of:

- `clean` — `validate` found no mismatch.
- `drift` — `validate` found a mismatch, or the user states that the issue has drifted (a message that says so answers the question with `drift`; ask nothing). No shortcut is offered: the mismatches become starting content for `Explore change`, and the issue follows the planned Explore steps.
- `declared-clean` — the user chose to skip validation. The shortcut stays available, because the user owns that decision.

`--fast-track` skips nothing here: the question is always asked of the user.

## Conversion

The tool `ready-to-propose.js convert` owns the form check and the issue-to-block mapping; the model never writes the block from the issue. Resolve `<tool-path>` per `@sai/policies/tool-resolution.md` and run `node <tool-path> convert [--change-name <name>] [--declared-clean]` with the issue text exactly as it entered the conversation on stdin (Markdown or HTML), delivered as `@sai/policies/stage-machine.md` § Event delivery describes. It prints one JSON object. Run it without options when the issue arrives, for `ready_to_propose_form` and `proposed_change_name`. Run it again after the drift check with the confirmed `--change-name`, adding `--declared-clean` for the `declared-clean` outcome, which makes the tool add the `Request Additional Notes` line recording that drift was declared rather than validated.

- `converted: false` with `rejections` is a **conversion rejection**: the tool or the `dispatchable` validator rejected the block derived from the issue (an issue that still has entries in `Open questions` is always one). Show each reason in one line, in the ambient conversation language, ask no shortcut question, and continue with the planned Explore steps.
- `converted: true` returns `block` (the draft), `edge_cases` and `implementation_details` (the issue's lists, literal), and `validation.flagged` (lines awaiting the hygiene judgment of the block emit).

## Shortcut question

Ask it after `clean` or `declared-clean` when the conversion succeeded. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode). When the issue carries no implementation notes (`implementation_details` is empty), show `- None` as the implementation-details list in the question's context: accepting the shortcut then counts as the user's confirmation of that `- None`, and declining it takes the normal path through `Implementation details`. Two options, in this order:

- `shortcut` — go directly to the implementation routes: the issue is converted into the `Ready to Propose` block and the exploration enters `Crystallize`.
- `planned-steps` — follow the planned Explore steps, with the issue's lists preloaded as in **On `work`**.

`--fast-track` skips nothing here: the question is always asked of the user. On `planned-steps`, continue as on `work`; after `declared-clean`, the block Explore composes at `Crystallize` carries the same `Request Additional Notes` line, copied from a `convert --declared-clean` run.

## On `shortcut`

1. **Review the draft.** The draft's role is fixed: the tool authored it, you review it. Correct it only under these four invariants:
   - every field comes from the issue text, and a field without a source reads `- None`; invent no `Alternatives Considered`, `Trade-offs Accepted`, `Terms`, or any other field;
   - the `E` and `I` lists stay literal: identifiers, wording, and order are untouched;
   - the block keeps the issue's language: translate nothing;
   - every correction is shown with its reason before the route choice.
2. **Record the shortcut.** Send `{"intent":"issue-shortcut","edgeCaseList":[...],"implementationDetailsList":[...]}` to `explore-idea@1` per `@sai/policies/stage-machine.md`, the two lists being the tool's `edge_cases` and `implementation_details` strings verbatim (an empty `implementation_details` is sent as `[]`, the confirmed `- None`). The intent is valid only at `Explore change` and moves the stage to `Crystallize`; the block guard still rejects a block emit on every other path. On `rejected`, report it in one line and continue with the planned Explore steps.
3. **Crystallize.** Follow the returned `next.follow`. The slicing assessment runs as always, because a mature issue may not fit one change. A single change takes the reviewed draft as its block. A sliced set derives each slice's block from the draft and distributes the `I` items across the slices with their literal text, as `crystallization-protocol.md` sets. Every block of the set is dispatchable and in the issue's language: the crystallization language gate applies its source-language level and asks no language question.
4. **Show the corrections.** Immediately before the block set at the shared close's print step, print the corrections you made, each as the field, the change, and its reason. With none, print one line saying the draft needed none. The route choice follows the printed blocks as usual.
