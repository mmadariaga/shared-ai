> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-2-design` spent effort on a ~30-line path rubric that derived a `layer`/`discipline`/`complexity` tuple, conflating context volume with reasoning demand. It also prescribed mandatory dialogue turns through a `Collaboration style` section, and it re-ran general codebase discovery on every run. An upcoming `/sai-3-implement` consumer (issue #52) needs a per-step `difficulty` and relies on design steps mapping one-to-one to implementation Steps.

## What Changes

- The `tasks.md` Routing line becomes `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>`. It keeps its position (right after the step title, before `**Files Affected**`), the `·` separator, the key=value form, and the optional trailing parenthetical that parsers ignore from the first `(`. Changed in the skeleton in `sai/commands/design/steps/tasks.md` and in `openspec/schemas/sai-workflow/templates/tasks.md`.
- The path-pattern derivation rubric is removed from `sai/commands/design/steps/tasks.md`: the layer and discipline tables, precedence rules, the complexity heuristics and the prose-precedence-over-table rule. Each value is now defined by its goal:
  - `category=frontend-ui|frontend-code|backend|data|infra|docs|other`: the kind of work by purpose. A mix takes the best fit; `other` only when nothing fits, with a parenthetical note.
  - `context=small|medium|large`: how much the implementer must load.
  - `difficulty=low|medium|high`: how hard the Step is for the implementer to finish from its plan, tests and `interfaces.md` contract. Round up when unsure. A Step with no RED block is still judged.
- The implementer is defined once beside the Routing line as the agent that implements the Step in `/sai-4-apply`, no more capable than the design agent and usually less.
- The clause letting `/sai-3-implement` split, merge or refine steps is removed. Step numbering is final, and each `tasks.md` Step corresponds one-to-one to an `implementation.md` Step. Every Step of one `tasks.md` uses the new format.
- `sai/commands/design/steps/common.md` replaces `Collaboration style` with `Decision style`: inputs arrive settled; design resolves evidence-justified technical choices itself; spec-changing assumptions go to `design.md` Open Questions; questions go only through the existing gates (blocking Open Questions, spec-amendment authorization, artifact-feedback gate). The header mentions are updated.
- `sai/commands/design/steps/research.md` now starts research from existing evidence: `proposal.md` including `## Proposal Research Documentation`, the specs, and on a rerun the existing design artifacts.
  - Only gaps are researched: the files the design changes, their callers, their tests, and missing, contradictory or possibly stale facts.
  - A stale cited path is treated as a gap. A proposal without research documentation blocks nothing.
  - The explorer prompt now verifies a named `{gaps}` list.
  - Research is done when every changed file, its callers and its tests are verified.
- `GLOSSARY.md` replaces `Routing Layer`, `Routing Discipline` and `Routing Complexity` with `Routing Category`, `Routing Context` and `Routing Difficulty`. It updates `Routing Line` and the relationships, dropping path derivation and the sai-3 refine permission.
- `README.md` documents the model capability funnel `sai-2` >= `sai-3` >= `sai-4` in the model customization section; a more capable later phase is unsupported.

## Capabilities

### New Capabilities
- `design-research-reuse`: design research starts from the proposal, its research documentation, the specs and prior design artifacts, and researches only gaps.

### Modified Capabilities
- `tasks-routing-metadata`: the Routing line carries `category`, `context` and `difficulty`, defined by purpose and measured against the implementer, replacing the path-derived `layer`/`discipline`/`complexity` vocabularies and the reproducibility requirement.
- `tasks-scaffold-format`: the scaffold, template and schema-instruction Routing keys change; routing no longer derives from Files Affected paths; the glossary relationship drops the routing derivation; tasks Steps correspond one-to-one to implementation Steps.
- `design-steps-library`: `common.md` carries a decision style instead of a collaboration style.

## Impact

Modified files:
- `sai/commands/design/steps/tasks.md`
- `sai/commands/design/steps/common.md`
- `sai/commands/design/steps/research.md`
- `openspec/schemas/sai-workflow/templates/tasks.md`
- `GLOSSARY.md`
- `README.md`

No new files. Existing tests are unchanged: they check only the `**Routing**` marker, and the `**Routing**: layer=x` fixtures in `test/apply-step-tool.test.js` and `test/file-manifest-tool.test.js` are format-agnostic. Existing `tasks.md` files are not migrated. No consumer of the Routing line is built.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Follow-up context agreed in this exploration:
- Issue #50's change carries the `## Required Documentation` rewrite, agreed draft: "`## Required Documentation`: the specs and sources the implementer needs. List every spec the steps reference, and the local files and URLs, drawn from any evidence this design used (its own research, the proposal's research documentation, prior artifacts), that matter for implementing the change, each with its relevance note. Leave out resources that only gave context." Subsection format, ` — ` separator, ~20-word notes and whole-file paths stay.
- Issue #52 should use the same implementer wording on the consumer side: "An agent no more capable than you, and usually less capable, will do the final implementation in `/sai-4-apply`. Write the minimum code, according to the Step's difficulty, that agent needs to complete it."
- sai-1 research alignment (start from Ready to Propose premises and research only gaps) remains a leftover of issue #48, whose research candidate was not applied.
- Observed drift outside this change: `AGENTS.md` says RED/GREEN dispatch on the budget tier, while the shipped worker matrix defaults GREEN to the planner's model.
- Undecided: whether `doctor` warns when a later phase's model exceeds an earlier one's; issue #52 Q6 owns it (affects E9).
