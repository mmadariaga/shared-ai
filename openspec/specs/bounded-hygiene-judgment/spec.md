# bounded-hygiene-judgment Specification

## Purpose
Define the closed judgment that decides, for each line the lexical pre-filter flags, whether it requests forbidden work or only describes the change's subject.

## Requirements

### Requirement: Judgment policy lists the tool's clause ids

`sai/policies/block-hygiene-judgment.md` SHALL list exactly the four clause ids of the tool's `HYGIENE_CLAUSES` — `planning-artifact`, `mutating-git`, `subagent-dispatch`, `published-spec-edit` — as the only ids a verdict may carry. A test SHALL assert that the policy and the tool list the same ids in the same order.

#### Scenario: Policy and tool agree

- **WHEN** the clause ids listed in the policy are compared with `HYGIENE_CLAUSES`
- **THEN** both lists are identical

### Requirement: Only flagged lines are judged, each with one evidenced verdict

The judgment SHALL decide each flagged `(line, clause)` pair and nothing else, with one verdict: `context` when the line describes the change's subject, motivation, a constraint, an exclusion, or existing behavior, and `violation` when the line asks the implementer to perform the clause's action as work of this change. An ambiguous line SHALL be judged `violation`. Every verdict SHALL carry one short sentence of evidence quoting or naming what decided it.

#### Scenario: A mention is context

- **WHEN** a flagged line says the change documents git commit messages
- **THEN** the verdict is `context` with its evidence and the block stays dispatchable

#### Scenario: A requested forbidden action is a violation

- **WHEN** a flagged line asks the implementer to run `git commit`
- **THEN** the verdict is `violation` with its evidence

### Requirement: Verdict shape and transport

Each verdict SHALL be a JSON object `{clause, line, evidence, verdict}` with `verdict` either `violation` or `context`, collected in one array sent after a `<<<VERDICTS>>>` line below the block set to `sai-state emit --ready-to-propose` or to `ready-to-propose.js check --profile dispatchable`. Line numbers SHALL refer to the exact text sent; after any edit of the block, the tool SHALL be run again and the lines judged again.

#### Scenario: Edited block is judged again

- **WHEN** a block is corrected after a violation verdict
- **THEN** the corrected set is checked again and its flagged lines receive fresh verdicts

### Requirement: A violation makes the block undispatchable

A `violation` verdict SHALL mean the block cannot be dispatched; its clause, line number, and evidence SHALL be shown, and the block author SHALL correct the line (or, in `/sai-1-spec`, the user re-copies a corrected block) before the set is validated again from the start.

#### Scenario: Violation is shown with its evidence

- **WHEN** a judgment returns a `violation` verdict
- **THEN** the clause, line number, and evidence are shown and nothing is recorded or written
