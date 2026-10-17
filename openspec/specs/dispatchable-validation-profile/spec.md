# dispatchable-validation-profile Specification

## Purpose
Provide a deterministic `dispatchable` profile in `sai/tools/ready-to-propose.js` that checks block structure, hashes each block, and flags lines for the hygiene judgment.

## Requirements

### Requirement: Dispatchable profile is a superset of strict with an implementation item check

`ready-to-propose.js check --profile dispatchable` SHALL apply every `strict` check and SHALL additionally check the implementation item rules. In a sliced set (more than one block) it SHALL report `NO_IMPLEMENTATION_ITEM` on a block whose `**Implementation Details**` field carries no in-scope item other than `None`; a single block with `- None` there SHALL NOT be reported. It SHALL report `DUPLICATE_IMPLEMENTATION_ITEM` on a block where an `I<n>` identifier appears more than once across `**Implementation Details**` and `**Out of scope Implementation Details**`, and, in a sliced set, a set-level `UNOWNED_IMPLEMENTATION_ITEM` for each `I<n>` that is in scope of no block. Every dispatchable block SHALL pass `strict`. The verdict SHALL carry `ok` (the deterministic structural result), `profile`, `names`, `blocks`, set-level `violations`, `flagged`, `judgment`, and `dispatchable`.

#### Scenario: A single block with None is dispatchable

- **WHEN** a single block with `**Implementation Details**` as exactly `- None` is checked
- **THEN** the `dispatchable` profile reports `ok` true and `dispatchable` true, and the `strict` profile also accepts it

#### Scenario: Empty implementation section fails only the dispatchable profile

- **WHEN** a block in a sliced set has `**Implementation Details**` as exactly `- None` and is checked
- **THEN** the `dispatchable` profile reports `NO_IMPLEMENTATION_ITEM` with `ok` false, while the `strict` profile still accepts it

#### Scenario: Each slice needs its own item

- **WHEN** a two-block set has one block with an in-scope item and one with `- None`
- **THEN** only the second block carries `NO_IMPLEMENTATION_ITEM`

#### Scenario: A duplicated identifier is reported

- **WHEN** a block lists `I1` under both implementation sections, or twice under `**Implementation Details**`
- **THEN** the block carries `DUPLICATE_IMPLEMENTATION_ITEM` and `ok` is false

#### Scenario: An unowned identifier is reported once per item

- **WHEN** a sliced set lists `I3` only under `**Out of scope Implementation Details**` in every block
- **THEN** the set-level violations carry exactly one `UNOWNED_IMPLEMENTATION_ITEM` naming `I3`, and a set where `I3` is in scope of some block passes

### Requirement: Each block carries a sha256 hash

The `dispatchable` verdict SHALL carry, per block, `hash`: the lowercase hex sha256 of the block text from its heading line through its `---` line with line endings normalized to LF.

#### Scenario: Hash matches the extracted block text

- **WHEN** a canonical block is checked
- **THEN** its `hash` is a 64-character hex string equal to the sha256 of that block's extracted text

### Requirement: Lexical pre-filter flags lines without rejecting them

The profile SHALL run a lexical pre-filter over each block body and report every matching `(line, clause)` pair as `{block, line, clause}` per block and at set level, where `clause` is one of the ids `planning-artifact`, `mutating-git`, `subagent-dispatch`, and `published-spec-edit`. The tool's `HYGIENE_CLAUSES` list SHALL be the single source of those ids and their patterns. A flagged line SHALL NOT be a structural violation.

#### Scenario: Each clause is flagged with block, line, and clause id

- **WHEN** a block line requests writing `tasks.md`, running `git commit`, dispatching a worker, or editing `openspec/specs/foo/spec.md`
- **THEN** the verdict flags that line with the matching clause id, `ok` stays true, and `dispatchable` is false until the line is judged

#### Scenario: Ordinary prose is not flagged

- **WHEN** a line mentions the design, the git history, or the task list without the trigger patterns
- **THEN** no line is flagged

### Requirement: Verdicts resolve flagged lines

The profile SHALL read optional judgment verdicts as a JSON array after a stdin line equal to `<<<VERDICTS>>>` and SHALL match them to flagged lines by `line` and `clause`. A flagged line SHALL be cleared only by a `context` verdict with non-empty evidence. The `judgment` object SHALL report `pending` (flagged lines with no verdict), `violations` (lines with a `violation` verdict), `unknown` (verdicts for lines that were not flagged), `invalid` (malformed verdicts), and `cleared`. Verdicts that are not a JSON array SHALL produce a `VERDICTS_UNPARSEABLE` structural violation. `dispatchable` SHALL be true only when `ok` is true and the judgment has no pending, violation, unknown, or invalid entry.

#### Scenario: A context verdict clears a flagged line

- **WHEN** a flagged `mutating-git` line is sent with a `context` verdict carrying evidence
- **THEN** `dispatchable` is true and `judgment.cleared` holds that verdict

#### Scenario: A violation verdict blocks the set

- **WHEN** the same line is sent with a `violation` verdict
- **THEN** `dispatchable` is false and `judgment.violations` reports the line

#### Scenario: Unknown, malformed, or unparseable verdicts keep the set undispatchable

- **WHEN** verdicts name an unflagged line, lack evidence or a known clause, or are not a JSON array
- **THEN** `dispatchable` is false

### Requirement: Dispatchable exit code follows dispatchability

For the `dispatchable` profile the CLI SHALL exit 0 only when `dispatchable` is true and 1 otherwise, including a pending judgment; usage or I/O errors SHALL exit 2.

#### Scenario: Pending judgment exits 1

- **WHEN** a structurally valid block with an unjudged flagged line is checked
- **THEN** the CLI exits 1

### Requirement: File-backed checking composes verdict delivery mechanically

`ready-to-propose.js` SHALL accept `check --profile dispatchable --block-file <path>` and optional `--verdicts-file <path>`. Its shared composer SHALL accept complete block text and a verdict array, reject an existing verdict suffix, incomplete blocks, non-array or invalid/incomplete verdicts, and place the marker on a separate line without changing the established block hash rules. The executable `compose --block-file <path> --verdicts-file <path>` SHALL emit composed stdout on success and no content on failure. A marker glued to the final separator SHALL remain invalid.

#### Scenario: Composition handles both final-newline states

- **WHEN** valid blocks with and without a final newline are composed with their evidenced verdict arrays
- **THEN** both deliveries validate, contain a separate marker line, and retain the original extracted-block hash.

#### Scenario: Incomplete composition remains rejected

- **WHEN** a block lacks its final separator or its verdicts are invalid, unknown, or incomplete
- **THEN** composition fails instead of weakening structural or verdict validation.
