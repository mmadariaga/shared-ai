# ADR 0249b: The agent decides fetch directive conditionality

<!-- adr-index: amends 0248 -->

## Status

Accepted.

Amends [ADR 0248](./0248-conditional-directives-carry-the-marker-and-section-gate.md).

## Context

The dependency-tree change migrated 80 `Fetch` directives, on 79 lines, to the `?` marker with a deterministic lint heuristic that treated event nouns, the directive's own path, ordinary words such as `once`, and the previous paragraph as conditions. A manual review classified 35 as required and 45 as genuinely conditional: the 18 `worker-report-transport` loads, the 2 `test-execution` loads, the 9 top-level `obstacle-escalation` loads, and six single loads, while the `routed-commit-command`, `routed-archive-command`, and `routed-backfill-command` specs require `worker-report-transport` unconditionally. The tree also counted nested conditional nodes without printing `?` on them, and the directive parser missed three lowercase `fetch @` directives, including the archive commit gate.

## Decision

The agent decides conditionality from the prose, and the lint validates form only. A required directive stays unmarked, and a conditional one keeps `Fetch?` with its condition stated in the directive's paragraph or `##` section; the 35 required directives are unmarked and the 45 conditional ones keep the marker. `sai/tools/lint.js fetch-directives` reports only `FETCH_DIRECTIVE_FORM`: a marker not directly after the verb, a lowercase verb, or a directive phrase that sits whole in a code span; a template path and a fenced directive are payload, and `FETCH_MARKER_WITHOUT_CONDITION` and `FETCH_UNMARKED_CONDITIONAL` are removed. The fetch tool classifies a directive by the marker the author wrote and never infers conditions from prose. Its tree prints `?` on every node of the computed conditional set, a nested node reached through a marked edge included, so the `?` node lines equal the summary's conditional count, aliases excluded. The directive parser accepts `Fetch`, `Also fetch`, `Fetch?`, `Also fetch?`, and the lowercase `fetch` form; the three lowercase directives are normalized to `Fetch?` (the archive Ordinary route, Direct Build step 5, and the `Otherwise` branch of `sai-commands`), and the doctor parser accepts the lowercase form too, so the archive commit gate appears in its coordinator's tree as a conditional node. The published specs remain the source of truth: the cards load `worker-report-transport` without the marker as those specs require.

## Alternatives Considered

- **Harden the lint regex.** Rejected: the event-noun, path self-match, and previous-paragraph leaks are structural, and a deterministic heuristic on prose is the wrong layer for the decision.
- **Update the specs to allow `Fetch?` on `worker-report-transport`.** Rejected: the worker needs the contract for every report.
- **Mark only the first node of a conditional subtree.** Rejected: the summary and the `?` lines would disagree, and an agent could load a conditional subtree as required.
- **Leave the lowercase `fetch` as prose.** Rejected: the archive commit gate would remain outside the tree.

## Consequences

- Classification is a review responsibility: a later instruction change can reintroduce a wrong marker without a lint failure, and the tests pin the known required and conditional directives.
- The tree keeps its closure, dedupe, alias, skill, unresolved, exit-code, and single-leaf behavior.
- This record amends ADR 0248, and ADR 0208 carries `Superseded by 0247`.

## Provenance

Change `correct-fetch-directive-markers`, decision "The agent decides conditionality from the prose; the lint validates form only".
