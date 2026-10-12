# validated-block-recording Specification

## Purpose
Record only dispatchable Ready to Propose sets at Explore's crystallization emit and store each recorded block's text, hash, and verdicts for later use.

## Requirements

### Requirement: Emit records only dispatchable sets

`sai-state emit <id> explore-slice@1 --ready-to-propose -` SHALL validate the stdin block set with the `dispatchable` profile and SHALL record the inventory only when the set is structurally valid and every flagged line carries a `context` verdict. A set with a structural violation, an unjudged flagged line, or a `violation` verdict SHALL record nothing, leave the machine untouched, and exit 1, with `validation.judgment.pending` listing the lines awaiting a verdict.

#### Scenario: An unjudged flagged line records nothing

- **WHEN** a structurally valid set with a flagged line and no verdicts is emitted
- **THEN** the emit exits 1, reports the line in `validation.judgment.pending`, and records nothing

#### Scenario: A violation verdict records nothing

- **WHEN** the set is emitted with a `violation` verdict for its flagged line
- **THEN** the emit exits 1, reports the verdict in `validation.judgment.violations`, and records nothing

### Requirement: Recorded blocks are stored with text, hash, and verdicts

On a dispatchable set the emit SHALL store in the session file a top-level `blocks` map keyed by change name, each entry holding the block `text`, its sha256 `hash`, and the `context` verdicts `{clause, line, evidence, verdict}` of its flagged lines, in the same session-file write as the inventory. A later successful block emit SHALL replace the whole map together with the inventory. An accepted single-slice amendment (`--amend <change-name>`) SHALL instead replace only that slice's entry, leaving the inventory and every other entry unchanged.

#### Scenario: Context verdicts record and store the set

- **WHEN** a set whose flagged lines all carry `context` verdicts is emitted
- **THEN** the inventory records its names and the session file stores each block's text, hash, and verdicts under its change name

#### Scenario: A later emit replaces the stored blocks

- **WHEN** a second dispatchable set is emitted in the same session
- **THEN** the stored `blocks` map holds only the second set's blocks

#### Scenario: An amendment replaces one entry

- **WHEN** an amendment for one pending slice is accepted
- **THEN** only that slice's entry in the `blocks` map changes

### Requirement: Block storage failures are reported, never silent

After a successful emit the command SHALL confirm that the stored blocks match the recorded inventory, SHALL retry the store once when they do not, and, if the store still cannot be confirmed, SHALL remove any earlier emit's `blocks` map and add `BLOCKS_NOT_STORED` to the response `warnings` while the inventory stays recorded. After an accepted single-slice amendment, the command SHALL confirm the replaced entry and retry once; if the entry still cannot be confirmed, it SHALL add `BLOCKS_NOT_STORED` to the response `warnings`, and the previous entry SHALL remain stored.

#### Scenario: Unwritable session file is reported

- **WHEN** the stored blocks cannot be written after the inventory was recorded
- **THEN** the response carries `warnings` including `BLOCKS_NOT_STORED` and no stale blocks remain beside the new inventory

### Requirement: Crystallization close runs the hygiene judgment

When the block emit reports pending flagged lines, the crystallization close SHALL fetch `sai/policies/block-hygiene-judgment.md`, judge each pending line, and send the same set again with the verdicts after the `<<<VERDICTS>>>` line. On a confirmed violation it SHALL record nothing, show each violation's clause, line number, and evidence, recompose the set so the line no longer requests the forbidden action, and judge again within the validation retry limit; it SHALL ask the user only when the correction would change an agreed `E` or `I` item or the scope.

#### Scenario: Judged set is recorded

- **WHEN** the first emit reports pending flagged lines and the resend carries `context` verdicts for all of them
- **THEN** the set is recorded and the close continues to block display

#### Scenario: Correction that changes agreed scope asks the user

- **WHEN** removing a confirmed violation would change an agreed `I` item
- **THEN** the close asks the user before recomposing
