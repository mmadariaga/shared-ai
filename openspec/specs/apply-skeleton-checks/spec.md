# apply-skeleton-checks Specification

## Purpose
TBD - created by archiving change implement-detail-range. Update Purpose after archive.

## Requirements

### Requirement: Preflight restricts the Detail range instructions to Steps with a RED block

`apply-step.js preflight` SHALL interpret exactly the instruction verbs of one exported, ordered `INSTRUCTION_VERBS` list: `Write the test`, `Create a minimal stub`, `Copy and paste`, `Complete the skeleton below`, `Write the content described below`, `Modify`, `Update`, `Delete`, `Remove`. A checkbox line starting with any other verb SHALL NOT be interpreted as an instruction. Preflight SHALL report an error with the reason `skeleton and described-content instructions are valid only in a Step with a RED block` for a `Complete the skeleton below` or `Write the content described below` instruction in a Step without a RED block. The test suite SHALL pin the exact ordered list and drive preflight once for every listed verb.

#### Scenario: New instruction in a Step with a RED block
- **WHEN** Step 1 carries a RED block and its GREEN names `src/feature.js` under `Complete the skeleton below in` or `Write the content described below into`
- **THEN** preflight returns `ok: true`

#### Scenario: New instruction in a Step without a RED block
- **WHEN** Step 2 has no RED block and names `src/other.js` under `Complete the skeleton below in` or `Write the content described below into`
- **THEN** preflight returns an error for Step 2 whose reason states the instruction is valid only in a Step with a RED block

#### Scenario: Copy and paste stays valid everywhere
- **WHEN** Step 2 has no RED block and names `src/other.js` under `Copy and paste code below into`
- **THEN** preflight returns `ok: true`

#### Scenario: Interpreted verb list is pinned
- **WHEN** a verb is added to or removed from `INSTRUCTION_VERBS`, or the list is reordered
- **THEN** the pinned test in `test/apply-step-tool.test.js` fails

#### Scenario: Unlisted verb is not interpreted
- **WHEN** a Step's checkbox line starts with an unlisted verb such as `Rename` and names the unsafe path `../escape.js`
- **THEN** preflight reports no `required instruction path is not recognized` error for that line

### Requirement: Verify fails on leftover skeleton markers relative to the Step base

For each file named by a `Complete the skeleton below in` instruction in the Step's GREEN phase, `apply-step.js verify` SHALL count `TODO(sai-4)` occurrences in the working tree and in the file's `HEAD` version, where a file absent from `HEAD` counts 0. When the working-tree count exceeds the `HEAD` count, verify SHALL add the failure `leftover TODO(sai-4) marker in {path}: {count} found, {base} at Step base`. Verify SHALL report one `skeleton_markers` entry per such file with `path`, `base`, `count`, and `leftover`. Files not named by `Complete the skeleton below in` SHALL NOT be counted. The `red` dispatch SHALL skip the check and report an empty `skeleton_markers` list.

#### Scenario: Leftover marker in a new file
- **WHEN** a GREEN-side verify runs on a skeleton file absent from `HEAD` that still holds one `TODO(sai-4)`
- **THEN** `skeleton_markers` reports `{path, base: 0, count: 1, leftover: true}`, the failure names the file, and `ok` is false

#### Scenario: Marker removed
- **WHEN** the same verify runs after the marker is removed
- **THEN** the entry reports `leftover: false` and no leftover failure is added

#### Scenario: Legitimate marker text in HEAD
- **WHEN** a skeleton file's `HEAD` version already holds one `TODO(sai-4)` and the working tree holds one
- **THEN** the entry reports `leftover: false`, while a working tree holding two reports `leftover: true`

### Requirement: The apply tool source never contains the literal marker

`sai/tools/apply-step.js` SHALL build the `TODO(sai-4)` marker by concatenation so that its own source never contains the literal marker.

#### Scenario: Tool source scanned
- **WHEN** the tool's source text is searched for the literal marker
- **THEN** no occurrence is found
