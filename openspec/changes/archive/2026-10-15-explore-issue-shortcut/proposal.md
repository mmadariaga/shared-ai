> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Re-confirming lists a mature issue already carries wastes turns, and a model that writes the Ready to Propose block freely invents fields the issue does not contain, as an observed run did with `Alternatives Considered` and `Trade-offs Accepted`.

## What Changes

- `sai/commands/explore/steps/issue-intake.md` gains the issue shortcut. An issue has the Ready to Propose form when its `Maturity` section reads `Ready to propose`, read from the conversion tool's `ready_to_propose_form`; the work question's proposed `Change name` starts from the tool's `proposed_change_name`.
- For an issue with that form, a drift check follows `work` through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode) with the options `validate` and `declared-clean`; its outcome is `clean`, `drift`, or `declared-clean`. `drift` removes the shortcut and turns the mismatches into `Explore change` starting content; `declared-clean` keeps the shortcut. `--fast-track` skips nothing.
- An issue kept as `context` and later chosen for work resumes at the drift check when it has the form, or at `Explore change` otherwise, without asking the work question again.
- Conversion is owned by a new `sai/tools/ready-to-propose.js convert [--change-name <name>] [--declared-clean]` sub-command. It reads the issue on stdin as Markdown or HTML (HTML comments are removed and never carry content), reports the form, builds the draft block from the issue's own text with `- None` in every unsourced field (`Alternatives Considered`, `Trade-offs Accepted`, `Model / Re-framings`, `Terms`, `Out of scope Implementation Details`) and the `E`/`I` lists literal, validates it with the `dispatchable` profile, and otherwise returns rejection reasons (open questions, missing or empty mandatory sections, unverifiable scope items, unidentified `E`/`I` items, dispatchable violations). `--declared-clean` adds the `Request Additional Notes` line recording that drift was declared without validation. Exit 0 converted or form absent, 1 rejected, 2 usage or I/O error.
- On a conversion rejection, Explore shows each reason in one line and continues with the planned Explore steps without asking the shortcut question. After `clean` or `declared-clean` with a successful conversion, the shortcut question offers `shortcut` and `planned-steps`.
- On `shortcut`, the model reviews the draft under four invariants (every field from the issue text, `E`/`I` lists literal, the issue's language kept, every correction shown with its reason before the route choice), sends the new `issue-shortcut` intent to `explore-idea@1`, and follows `next.follow` into `Crystallize`, where slicing still runs and distributes the `I` items with their literal text.
- `sai-state/machines/explore-idea.js` accepts `issue-shortcut` only at `explore-change`, records the supplied `edgeCaseList` and non-empty `implementationDetailsList`, and moves to `crystallize`; it rejects with `SHORTCUT_NOT_AT_EXPLORE_CHANGE` elsewhere and `SHORTCUT_LISTS_INVALID` for malformed lists. The block guard keeps rejecting a block emit on every other path.
- `sai/commands/explore/steps/crystallization-language-gates.md` adds a first level: a block derived from an external source keeps the source's language with no question and no translation, and a set `explore.readyToProposeLanguage` produces one line saying it does not apply.
- `sai/commands/explore/instructions.md` item 3 names the issue shortcut as the one path into `Crystallize` directly from `Explore change`; the step map lists the new intake parts.
- The issue format moves from `skills/universal/to-backlog/issue-format.md` to `sai/policies/issue-format.md`. `to-backlog` fetches it from there, the to-backlog reference projection no longer lists it, and the tool's section and `Maturity` constants are checked against the policy by a test.
- `AGENTS.md`, `sai/policies/tool-resolution.md`, and `skills/universal/to-backlog/providers/azuredevops-content.md` document `convert` and the policy location.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-issue-intake`: Ready to Propose form read from the tool, context resume, drift check, conversion, shortcut question, and shortcut review and entry into `Crystallize`.
- `ready-to-propose-detection`: the `convert` sub-command and its policy-checked constants.
- `explore-stage-machine`: the `issue-shortcut` intent.
- `explore-crystallization-language-gate`: the source-language first level.
- `explore-pre-crystallization-stages`: the shortcut answer as the one other advancement into `Crystallize`.
- `explore-edge-case-gate`: the issue's agreed lists satisfy the gate on the shortcut.
- `explore-direct-input`: the issue shortcut as the one exception to the mandatory stages.
- `to-backlog-issue-format`: the format definition lives in a shared SAI policy.
- `to-backlog-conversation-capture`: preparation fetches the format policy.
- `to-backlog-harness-installation`: the format installs through the SAI policies projection.

## Impact

- New: `test/ready-to-propose-issue-conversion.test.js`
- Moved: `skills/universal/to-backlog/issue-format.md` → `sai/policies/issue-format.md`
- Modified: `AGENTS.md`, `sai-state/machines/explore-idea.js`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/crystallization-language-gates.md`, `sai/commands/explore/steps/issue-intake.md`, `sai/install-manifest.json`, `sai/policies/tool-resolution.md`, `sai/tools/ready-to-propose.js`, `skills/universal/to-backlog/SKILL.md`, `skills/universal/to-backlog/providers/azuredevops-content.md`
- Tests: `test/azure-publication-corrections.test.js`, `test/explore-idea-intent-gate.test.js`, `test/sai-state-ready-to-propose-emit.test.js`, `test/to-backlog-issue-format.test.js`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
