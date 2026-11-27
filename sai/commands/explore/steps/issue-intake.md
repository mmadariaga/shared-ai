# Issue intake

Fetch `@sai/policies/issue-origin-preservation.md`. On `work`, retain the
imported or conversation-verified selected issue URL for document creation.
Check that the resulting change document retains it (its `Backlog origin:` line) before storage; use the
validated amendment protocol when a document was already prepared. Context-only
issues and parent links do not become the selected change's origin.

An **issue** is any issue, bug, or ticket whose content is in the conversation, whatever its source: imported, pasted, read from a file, or passed as the `/sai-explore` argument. All sources follow this one intake, and it names no skill. Hidden markers and HTML comments in the issue never carry document content.

**Trigger.** Intake starts on an issue URL that the load of `body.md` imported (§ Issue URL import there: the cleaned `/sai-explore` argument is exactly one URL that `from-backlog.js detect` classifies as an issue), on text in issue format (a description with the headings `## Problem`, `## Goal`, `## Scope`, `## Non-goals`, `## Open questions`, and `## Maturity`) or on an explicit user statement that the text is an issue. Any other link is ordinary content and triggers nothing. Any other text enters through the direct-looking request rule in `sai/commands/explore/instructions.md`.

**Intake reading.** As soon as the issue's complete content is in the conversation, and before the work question, read the issue once with the conversion tool: write the issue's complete text — its title as a `# <title>` first line, then its description exactly as it entered the conversation (Markdown or HTML), or the text exactly as it entered when it already begins with a `# <title>` line, such as a pasted change document — to a file in a directory from `transfer.js open` with the harness-native file-write tool, and run `change-document.js sections` as **Seeding** describes, with `--origin <issue-url>` for an imported issue. Read `ready_to_propose_form`, `proposed_change_name`, `declared_clean_note`, `change`, `backlog_origin`, `sections`, `open_questions`, and `seed` from that one reading. When `sections` fails, report it in one line, run no fast path, and continue with the planned Explore steps from `Explore change` with every section `open` (`SECTIONS_INVALID`); never run `sections` again for that issue. When the issue is re-crystallized from a stored document, the document is its own intake text.

**Mature issue.** An issue is mature when `ready_to_propose_form` is `true`. A mature issue takes the fast path:

1. **Precheck.** Run `node <tool-path> check --input-file <the same file> --cwd <project-root>` for `sai/tools/issue-precheck.js`, resolved per `@sai/policies/tool-resolution.md`. It prints `{checked, unchecked, missing}` and exits 0 whether or not references are missing; read `missing` and `unchecked`, never the exit code. Before the round, show each `missing` entry with its `ref` and `section`, or one line that every checked reference was found; when `unchecked` is above zero, add one line that this many symbols could not be checked, because git could not search the working tree. When the precheck fails, say so in one line and let the round go on. The precheck informs and never decides: never open a section from it.
2. **Summary.** Present the issue as a summary: link, state, title, `Goal`, the counts of edge cases, implementation notes, and decisions, and every comment in full with its author. The full text appears once, in the final document.
3. **One round.** Ask the work question and the drift check as one round of `@sai/policies/question-rounds.md`, in that order; the round closes the turn. The drift check is a conditional question, included only when the seed leaves at least one section `agreed`. A message that already states the intent to work on the issue answers the work question with `work`; the round then carries the drift check alone. A free-text work answer that corrects the proposed `Change name` fixes that name for seeding and for the composed document.
4. **Outcome.** On `work`, seed the sections and apply the drift answer as **On `work`** and **Drift check** describe. When every section is agreed with source `issue` and the drift check ended `declared-clean` or `validate` with no mismatch, the exploration continues at `Crystallize`, where `crystallization-protocol.md` composes the document with the conversion tool instead of the model. Any section left open, and any drift mismatch, means no document is composed here: the exploration resumes at the first open section and the later crystallization is composed by the model as always. On `context`, the drift answer is not applicable: nothing is seeded and no document is composed.

An issue that is not mature keeps today's whole flow: the work question alone, the seed after `work`, and the drift check only when the seed leaves a section `agreed`.

**Work question.** Ask it once the intake reading is complete; for an issue that is not mature it closes that turn. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the issue summarized in the ambient conversation language before the picker and the question following `@sai/policies/question-context.md`. Two options, in this order:

- `work` — work on this issue.
- `context` — keep the issue as context only.

For a mature issue the question is asked as the round of **Mature issue** above and also shows the `Change name` proposed from the issue's `Goal` (kebab-case; start from the reading's `proposed_change_name` and reword it only for clarity); the user corrects it through the free-text answer.

- **Several unrelated issues** in one message: the question lists them all, one `work` option per issue plus `context`, falling back to numbered plain text beyond the harness picker capacity. The user picks at most one to work on; the rest stay as context.
- **Intent already stated.** A message that states the intent to work on the issue while bringing it (for example, "let's tackle this issue") answers the question with `work`; ask nothing. On the fast path the round then carries the drift check alone.
- **Ready to propose maturity.** Read maturity from the reading's `ready_to_propose_form`, never from your own judgment; never read the `Maturity` section yourself.

**On `work`**, in the same turn and with no separate activation turn:

1. The issue becomes the candidate idea, with its stated content as the idea's starting content, and `Explore change` begins as for any candidate idea (Closure State, stage TODO). An incoming issue is a candidate idea with agreed content, never an order to implement; ask only the unresolved substantive questions.
2. **Seed the sections** (see **Seeding**), sending the seed retained from the intake reading. Each stage section the issue agrees explicitly is recorded as `agreed` with the source `issue`; every other section is recorded `open`, with the issue's content as its starting proposal. Agreement and advancement for the open sections follow **List stages** in `steps/common.md` unchanged.
3. When the issue has related issues, Explore may explore them to enrich context. The work stays limited to the issue mentioned first.
4. When at least one section was seeded `agreed`, the **Drift check** applies: an issue that is not mature asks it here; a mature issue takes its answer from the round. Then **Resume at the first open section** moves the exploration there.

**On `context`**, no candidate idea exists: the issue informs the conversation, and the next input is classified as usual, with nothing seeded. When the user later chooses that issue for work, whatever its `Maturity`, run **On `work`** from step 1; the work question is not asked again.

## Seeding

The tool `change-document.js sections` owns the reading of the issue; the model never judges which sections an issue agrees. Resolve `<tool-path>` per `@sai/policies/tool-resolution.md` and run `node <tool-path> sections --input-file <path>` on the file **Intake reading** wrote, without expanding or escaping its text, adding `--origin <issue-url>` with the canonical URL of an imported issue. It accepts an issue of any `Maturity` and prints one JSON object. It builds no document: the change document is composed at `Crystallize` from the agreed sections (`crystallization-protocol.md`). Read these fields:

- `sections` — for each of `explore-change` (`What`/`Why`, from Problem, Goal, and Scope), `review-edge-cases` (the `E` list), and `implementation-details` (the `I` list): `status` `present` (the issue holds agreed content), `explicitly-empty` (the issue says none), or `absent` (missing, blank, or not agreed yet), and for a list its literal `items`.
- `open_questions` — each `Open questions` entry with the section it `affects`; an entry that maps to no single section affects `explore-change`.
- `seed` — the event that records all of it, built by the rules below. Send it verbatim, and only after `work`.
- `ready_to_propose_form` and `proposed_change_name` — the form flag and the `Change name` proposal for the work question (the issue's own `Change name:` line when it is a published change document, otherwise a proposal from its `Goal`); `declared_clean_note` — the line the document's `## Additional notes` carries after `declared-clean`.
- `change` and `backlog_origin` — the `## Change` lines of a re-imported published change document (`name`, `depends_on`, `backlog_origin`, `explore_origin`, `specs`) and the origin the change takes: `backlog_origin.value` is the imported URL when the document names none and the document's own value when it names a different issue, which `backlog_origin.warning` reports and the conversation shows. The document composed at `Crystallize` carries `backlog_origin.value` as its `Backlog origin:` line and the document's `Explore origin:` list in order.

The seed follows one rule: a section is `agreed` only when the issue holds it explicitly (`present` or `explicitly-empty`) and no open question affects it. An `explicitly-empty` list is seeded as the agreed empty list; an `absent` section, or one an open question affects, is seeded `open`, keeping the issue's items as the starting proposal. A section is skipped only because its data already exists in an agreed source: the data itself is never omitted, and an `agreed` list reaches the document exactly as the issue wrote it.

Send the seed to `explore-idea@1` per `@sai/policies/stage-machine.md` § Event delivery (an input file: the event is nested). The event is `{"sections": {...}}`, carries identifiers only (`E1`, `I3`), and records state, source, and starting lists without moving the stage. On `SECTIONS_INVALID`, report it in one line and continue with the planned Explore steps from `Explore change`, every section `open`.

## Drift check

Ask it once `work` is answered and at least one section was seeded `agreed` for an issue that is not mature; on the fast path its answer arrives in the same round as the work question. No earlier assessment of the issue replaces it, because an assessment of an empty or open-ended issue validates nothing. Present it through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (`AskUserQuestion` on Claude Code, `question` on opencode), with the question following `@sai/policies/question-context.md`. Two options, in this order:

- `validate` — Explore compares each `agreed` section's behaviors, constraints, and implementation notes with the current code, read-only, delegating bulk lookups per `sai/policies/remember.md`, and reports each mismatch with its path. On the fast path the precheck's `missing` entries are the starting point of the comparison.
- `declared-clean` — skip validation: the user declares that the issue has no drift.

The outcome is exactly one of:

- `clean` — `validate` found no mismatch; every `agreed` section stays agreed, and a mature issue's fast path composes its document.
- `drift` — `validate` found a mismatch, or the user states that the issue has drifted (a message that says so answers the question with `drift`; ask nothing). Each mismatch, doubt, or improvement is shown with its evidence and marks only the section it touches `open` (`{"sections": {"<stage>": {"state": "open"}}}`, the section's list staying as the starting proposal). No document is composed on the fast path. The discussion covers only the new or conflicting items; every other section stays `agreed`.
- `declared-clean` — the user chose to skip validation. Every seeded section stays agreed, because the user owns that decision, and the document Explore composes at `Crystallize` carries the `declared_clean_note` line in its `## Additional notes` section.

The same rule holds for the whole conversation: a deviation, doubt, or improvement you find in an `agreed` section at any later point marks only that section `open` and is shown with its evidence.

## Resume at the first open section

Once the seed and the drift check are recorded, move the exploration with one `goto` per `@sai/policies/stage-machine.md`: target `crystallize`, reason `user-request` (the user answered `work`). When every section is agreed the move is accepted. A mature issue whose drift check ended `declared-clean` or `validate` with no mismatch enters `Crystallize` on the fast path: `crystallization-protocol.md` composes its document with the conversion tool. An issue that is not mature, and a mature issue with any open section or drift mismatch, is composed by the model as always: a single change takes its document from the agreed sections as `crystallization-protocol.md` sets, and a sliced set distributes the `I` items across the slices with their literal text. The slicing assessment runs as always, with one exception: a re-imported published change document (the reading returns `change.name`) skips it, because its origin exploration already sliced it. Every document of a set is dispatchable and the crystallization language gate applies its source-language level and asks no language question when every section kept the issue as its source. The route choice follows the printed documents as usual, and no route starts without its explicit answer.

When a section is still open the move answers `MISSING_PRECONDITIONS` with `missing` and `resume_at`: emit `goto` to `resume_at` (reason `user-request`) and present that stage with the issue's starting content, then continue through `List stages`; an open `What`/`Why` is displayed in the conversation language by the display rule of `sai/commands/explore/list-writing.md` § Display language, which also governs the `E`/`I` lists; the next forward move skips every stage whose section is still `agreed`. When `resume_at` is `explore-change` and the exploration already sits there, the rejection is `GOTO_ALREADY_AT_TARGET`: stay and present it.
