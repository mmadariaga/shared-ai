# Issue intake

Fetch `@sai/policies/issue-origin-preservation.md`. On `work`, retain the
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
- **Ready to Propose form.** The issue has the Ready to Propose form when its `Maturity` section reads `Ready to propose`. Read that from the conversion tool's `ready_to_propose_form` (see **Seeding**), never from your own judgment. For such an issue the question also shows the `Change name` proposed from the issue's `Goal` (kebab-case; start from the tool's `proposed_change_name` and reword it only for clarity). The user corrects it through the free-text answer.

**On `work`**, in the same turn and with no separate activation turn:

1. The issue becomes the candidate idea, with its stated content as the idea's starting content, and `Explore change` begins as for any candidate idea (Closure State, stage TODO). An incoming issue is a candidate idea with agreed content, never an order to implement; ask only the unresolved substantive questions.
2. **Seed the sections** (see **Seeding**). Each stage section the issue agrees explicitly is recorded as `agreed` with the source `issue`; every other section is recorded `open`, with the issue's content as its starting proposal. Agreement and advancement for the open sections follow **List stages** in `steps/common.md` unchanged.
3. When the issue has related issues, Explore may explore them to enrich context. The work stays limited to the issue mentioned first.
4. When at least one section was seeded `agreed`, the **Drift check** follows. Then **Resume at the first open section** moves the exploration there.

**On `context`**, no candidate idea exists: the issue informs the conversation, and the next input is classified as usual, with nothing seeded. When the user later chooses that issue for work, whatever its `Maturity`, run **On `work`** from step 1; the work question is not asked again.

## Seeding

The tool `ready-to-propose.js convert` owns the reading of the issue; the model never judges which sections an issue agrees. Resolve `<tool-path>` per `@sai/policies/tool-resolution.md` and run `node <tool-path> convert --input-file <path>`, the file holding the issue text exactly as it entered the conversation (Markdown or HTML), written as literal text with the harness-native file-write tool in a directory from `transfer.js open` (one file per call), with nothing expanded or escaped. Run it once the issue's complete content is in the conversation and again, with `--change-name <name>`, only when a later step needs a block draft. It accepts an issue of any `Maturity` and prints one JSON object. Read these fields whatever `converted` or the exit code say:

- `sections` — for each of `explore-change` (`What`/`Why`, from Problem, Goal, and Scope), `review-edge-cases` (the `E` list), and `implementation-details` (the `I` list): `status` `present` (the issue holds agreed content), `explicitly-empty` (the issue says none), or `absent` (missing, blank, or not agreed yet), and for a list its literal `items`.
- `open_questions` — each `Open questions` entry with the section it `affects`; an entry that maps to no single section affects `explore-change`.
- `seed` — the event that records all of it, built by the rules below. Send it verbatim.
- `ready_to_propose_form` and `proposed_change_name` — the form flag and the `Change name` proposal for the work question; `declared_clean_note` — the line the block carries after `declared-clean`.

The seed follows one rule: a section is `agreed` only when the issue holds it explicitly (`present` or `explicitly-empty`) and no open question affects it. An `explicitly-empty` list is seeded as the agreed `- None`; an `absent` section, or one an open question affects, is seeded `open`, keeping the issue's items as the starting proposal. A section is skipped only because its data already exists in an agreed source: the data itself is never omitted, and an `agreed` list reaches the block exactly as the issue wrote it.

Send the seed to `explore-idea@1` per `@sai/policies/stage-machine.md` § Event delivery (an input file: the event is nested). The event is `{"sections": {...}}`, carries identifiers only (`E1`, `I3`), and records state, source, and starting lists without moving the stage. On `SECTIONS_INVALID`, report it in one line and continue with the planned Explore steps from `Explore change`, every section `open`.

## Drift check

Ask it once `work` is answered and at least one section was seeded `agreed`. No earlier assessment of the issue replaces it, because an assessment of an empty or open-ended issue validates nothing. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the question following `@sai/policies/question-context.md`. Two options, in this order:

- `validate` — Explore compares each `agreed` section's behaviors, constraints, and implementation notes with the current code, read-only, delegating bulk lookups per `sai/policies/remember.md`, and reports each mismatch with its path.
- `declared-clean` — skip validation: the user declares that the issue has no drift.

The outcome is exactly one of:

- `clean` — `validate` found no mismatch; every `agreed` section stays agreed.
- `drift` — `validate` found a mismatch, or the user states that the issue has drifted (a message that says so answers the question with `drift`; ask nothing). Each mismatch, doubt, or improvement is shown with its evidence and marks only the section it touches `open` (`{"sections": {"<stage>": {"state": "open"}}}`, the section's list staying as the starting proposal). The discussion covers only the new or conflicting items; every other section stays `agreed`.
- `declared-clean` — the user chose to skip validation. Every seeded section stays agreed, because the user owns that decision, and the block Explore composes at `Crystallize` carries the `Request Additional Notes` line (`declared_clean_note`).

The same rule holds for the whole conversation: a deviation, doubt, or improvement you find in an `agreed` section at any later point marks only that section `open` and is shown with its evidence.

## Resume at the first open section

Once the seed and the drift check are recorded, move the exploration with one `goto` per `@sai/policies/stage-machine.md`: target `crystallize`, reason `user-request` (the user answered `work`). When every section is agreed the move is accepted and the slicing assessment runs as always, because a mature issue may not fit one change. A single change takes its block from the agreed sections as `crystallization-protocol.md` sets; a sliced set distributes the `I` items across the slices with their literal text. Every block of the set is dispatchable and the crystallization language gate applies its source-language level and asks no language question when every section kept the issue as its source. The route choice follows the printed blocks as usual, and no route starts without its explicit answer.

When a section is still open the move answers `MISSING_PRECONDITIONS` with `missing` and `resume_at`: emit `goto` to `resume_at` (reason `user-request`) and present that stage with the issue's starting content, then continue through `List stages`; the next forward move skips every stage whose section is still `agreed`. When `resume_at` is `explore-change` and the exploration already sits there, the rejection is `GOTO_ALREADY_AT_TARGET`: stay and present it.
