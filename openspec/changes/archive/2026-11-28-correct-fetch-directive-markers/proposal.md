> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The fetch dependency-tree change migrated 80 `Fetch` directives, on 79 lines, to `Fetch?` with a lint heuristic that inferred a condition from event nouns, the directive's own path, ordinary words such as `once`, and the previous paragraph. A manual review of every changed directive classified 35 as required and 45 as genuinely conditional. The misclassified required directives include the 18 `worker-report-transport` loads that every worker needs for every report, the 2 `test-execution` loads that every test run needs, 9 top-level `obstacle-escalation` loads, `merge/steps/resolve.md`'s `strategy.md`, `crystallization-protocol.md`'s `issue-format.md`, the adversarial expert review binding, two `tool-resolution` loads in `design/steps/tasks.md`, and the Direct Build `backfill-draft-validation` load. The tree excluded those required loads from its required set, while the `routed-commit-command`, `routed-archive-command`, and `routed-backfill-command` specs require `worker-report-transport` unconditionally.

## What Changes

- Unmark the 35 required directives: the 18 `worker-report-transport` loads across the commit, archive, implement, merge, review, audit, deep-review, plan, backfill, and Direct Build cards; the 2 `test-execution` loads in the implement and merge coordinators; the 9 top-level `obstacle-escalation` loads; `merge/steps/resolve.md`'s `strategy.md`; `crystallization-protocol.md`'s `issue-format.md`; the adversarial expert review binding; the two `tool-resolution` loads in `design/steps/tasks.md`; and the Direct Build `backfill-draft-validation` load.
- Keep `Fetch?` on the 45 genuinely conditional directives, each with its condition stated in its paragraph or `##` section.
- Remove `FETCH_MARKER_WITHOUT_CONDITION` and `FETCH_UNMARKED_CONDITIONAL` from `sai/tools/lint.js`, with their usage text and their lint cases. `fetch-directives` validates form only: the verb and the marker, and the path alone in its code span. It reports a lowercase verb as `FETCH_DIRECTIVE_FORM`.
- Fix the whole-phrase code-span check: a directive phrase whose span contains the verb is reported, not only a line that starts with `Fetch`.
- Print `?` on every node of the fetch tool's computed conditional set, including a nested node reached only through marked edges, so the `?` node lines equal the summary's conditional count, aliases excluded.
- Accept the lowercase `fetch` verb in the fetch tool's directive parser, the lint, and the doctor parser, and create no edge or reference from a word that merely embeds the verb. Normalize the three lowercase instances in `sai/commands/archive/coordinator.md`, `sai/commands/explore/direct-build-coordinator.md`, and `skills/universal/sai-commands/SKILL.md` to `Fetch?`.
- Align the `routed-commit-command`, `routed-archive-command`, and `routed-backfill-command` cards with their existing unconditional `worker-report-transport` requirements; no requirement of those capabilities changes.
- Keep the tree's closure, dedupe, alias, skill, unresolved, exit-code, and single-leaf rules unchanged.
- Tests assert the required and conditional classifications, the nested `?` marking, the archive gate in the tree, the whole-phrase code span, and the lowercase directive; no test accepts `Fetch\??` as a substitute.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fetch-directive-resolution`: conditionality is an author decision and the lint validates form only; the doctor parser accepts the marked and lowercase forms; the instruction files use one verb form.
- `format-linting`: `fetch-directives` reports directive-form violations only, adds the lowercase verb and the whole-phrase code span, and drops the two marker and section-gate checks.
- `claude-fetch-resolution`: the tree marks every node of the computed conditional set, and the directive parser recognizes the lowercase verb.
- `fetch-resolution-path-scoping`: the opencode mirror requirement covers the whole-conditional-set `?` marking and the lowercase directive form.

## Impact

- Modified instruction cards: `sai/commands/archive/{coordinator,worker}.md`, `sai/commands/audit/{coordinator,worker-common}.md`, `sai/commands/backfill/{coordinator,worker}.md`, `sai/commands/commit/{coordinator,worker}.md`, `sai/commands/deep-review/coordinator.md`, `sai/commands/design/steps/tasks.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/crystallization-protocol.md`, `sai/commands/implement/{coordinator,worker-common}.md`, `sai/commands/merge/{coordinator,worker}.md`, `sai/commands/merge/steps/resolve.md`, `sai/commands/plan/{cycle,worker-common}.md`, `sai/commands/review/{coordinator,worker}.md`, `sai/policies/adversarial-expert-review.md`.
- Modified tooling and skills: `skills/universal/fetch/fetch.js`, `sai/tools/lint.js`, `bin/doctor.js`, `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md`, `skills/universal/sai-commands/SKILL.md`.
- Modified tests: `test/accessibility-coordinator-worker.test.js`, `test/adversarial-expert-review.test.js`, `test/archive-backfill-goal-driven.test.js`, `test/budget-report-delivery.test.js`, `test/build-publication.test.js`, `test/cache-warmer.test.js`, `test/code-quality-priority-stack-policy.test.js`, `test/command-launcher-card.test.js`, `test/commit-goal-driven.test.js`, `test/delta-scenario-preservation.test.js`, `test/direct-build-goal-driven.test.js`, `test/doctor-fetch-resolution.test.js`, `test/explore-agent-tools.test.js`, `test/explore-step-reachability.test.js`, `test/fetch-tool.test.js`, `test/implement-family.test.js`, `test/implementation-closing-report.test.js`, `test/merge-efficiency-tool.test.js`, `test/merge-goal-driven.test.js`, `test/plan-family.test.js`, `test/test-execution-policy.test.js`, `test/validate-backfill-drafts.test.js`, `test/worker-report-transport.test.js`.
- New: none.
- Behavior: required directives load on every run of their card, conditional directives load only when their stated condition holds, and the fetch tree no longer hides a conditional subtree from the required set. Claude Code and opencode share `skills/universal/fetch/fetch.js`, `sai/tools/lint.js`, `bin/doctor.js`, and mirrored card and test assertions.
- Known limitations: the classification is a review responsibility; a later instruction change can reintroduce a wrong marker without a lint failure, and the tests pin the known required and conditional directives.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The review was performed against PR 595 (merged, head `32816d22`; the local tree `bdd6fd0b` matches). The 35/45 classification comes from reading each directive's paragraph and section, not from the lint. The detailed per-file review is in the exploration conversation.
