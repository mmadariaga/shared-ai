# ready-to-propose-detection Specification

## Purpose
TBD - created by archiving change ready-to-propose-detector. Update Purpose after archive.

## Requirements

### Requirement: Deterministic stdin detector with loose and strict profiles

The repository SHALL provide `sai/tools/ready-to-propose.js` with the sub-command `check --profile loose|strict`. It SHALL read the text to check from stdin, SHALL accept one or more blocks, and SHALL always print exactly one JSON verdict carrying `ok`, `profile`, `names`, `blocks` (each with `index`, `line`, `name`, and `violations`), and set-level `violations`. It MUST exit 0 when the text is valid for the profile, 1 when violations are found, and 2 on a usage or I/O error. `--json` SHALL be accepted and change nothing, and the tool SHALL take no `--cwd`.

#### Scenario: Valid text on stdin yields a JSON verdict and exit 0
- **WHEN** a canonical block is piped to `check --profile strict`
- **THEN** the tool prints one JSON verdict with `"ok": true` and the extracted change name, and exits 0

#### Scenario: Usage errors exit 2
- **WHEN** the tool runs without the `check` sub-command, without `--profile`, or with an unknown profile or flag
- **THEN** it writes a usage message to stderr and exits 2

### Requirement: Loose profile implements backfill's nine-literal quorum

The `loose` profile SHALL strip every `**` and then require each of the nine plain literals `Change name`, `What`, `Why`, `Capabilities in scope`, `Alternatives Considered`, `Trade-offs Accepted`, `Key constraints`, `Edge Cases`, and `Implementation Details` as a case-sensitive substring with its exact spacing, anywhere and in any order. It MUST NOT require the `## Ready to Propose` heading, a position, or content, and it MUST NOT require or count `Request Additional Notes`. Each missing literal SHALL be reported as a named violation.

#### Scenario: Literals anywhere without bold or heading pass
- **WHEN** text contains the nine literals in any order, without bold markers and without the heading
- **THEN** the `loose` verdict is `"ok": true` and the tool exits 0

#### Scenario: Casing or spacing variants do not match
- **WHEN** a literal appears only with different casing or spacing
- **THEN** the `loose` verdict names that literal as missing and the tool exits 1

### Requirement: Strict profile implements the canonical block format

The `strict` profile SHALL validate every block per `sai/policies/ready-to-propose-format.md`. Each block starts at a `## Ready to Propose` heading line and SHALL end at a `---` line. The block SHALL carry the field labels in this order: `Change name`, `What`, `Why`, `Capabilities in scope`, `Research Leads`, `Decisions & Rationale`, `Alternatives Considered`, `Trade-offs Accepted`, `Model / Re-framings`, `Key constraints`, `Terms`, `Edge Cases`, `Implementation Details`, `Out of scope Implementation Details`, an optional `Request Additional Notes`, and `Overview language`. `Change name`, `What`, `Why`, and `Overview language` SHALL carry their value on the label line, and the change name MUST be kebab-case. Mandatory sections SHALL carry content or `- None`. `Request Additional Notes`, when present, MUST carry content other than only `- None`. `Overview language` SHALL be the last non-blank line before `---`. Change names MUST be unique across the set, and the extracted names SHALL be returned in block order. Set-level distribution rules (each `E` once per set, `I` coverage) are outside the profile. Because labels are always English, the prose language of a block SHALL NOT affect the verdict.

#### Scenario: Multiple blocks keep their names in order
- **WHEN** two valid blocks with different change names are piped to `check --profile strict`
- **THEN** the verdict passes and `names` lists both change names in block order

#### Scenario: Duplicate change names fail
- **WHEN** two otherwise valid blocks carry the same change name
- **THEN** the verdict carries a `DUPLICATE_CHANGE_NAME` violation and the tool exits 1

#### Scenario: Fields omitted by the former lint list are required
- **WHEN** a block lacks `**Change name**`, `**What**`, `**Why**`, `**Terms**`, or `**Overview language**`
- **THEN** the verdict reports each missing field as `MISSING_SECTION` and the tool exits 1

#### Scenario: Prose in another language passes
- **WHEN** a block has English labels and Spanish prose
- **THEN** the `strict` verdict passes

### Requirement: Strict profile is a superset of the loose profile

Every text that passes the `strict` profile SHALL also pass the `loose` profile. A text MAY pass `loose` and fail `strict`.

#### Scenario: A strict-valid block passes loose
- **WHEN** a block that passes `strict` is checked with `loose`
- **THEN** the `loose` verdict passes

#### Scenario: Loose-only text fails strict
- **WHEN** text that carries the nine literals but not the full canonical format is checked with both profiles
- **THEN** `loose` passes and `strict` fails

### Requirement: Detector is documented and distributed without a manifest change

`sai/policies/tool-resolution.md` SHALL document the invocation shape `node <tool-path> check --profile loose|strict` with the text on stdin. `AGENTS.md` SHALL register `ready-to-propose.js` in its `sai/tools/` registry row. The tool SHALL reach both Claude Code and opencode through the existing `sai-tools` projection with no `sai/install-manifest.json` edit.

#### Scenario: The detector is registered and projected
- **WHEN** `AGENTS.md`, `sai/policies/tool-resolution.md`, and `sai/install-manifest.json` are read
- **THEN** the registry row and the invocation shape name `ready-to-propose.js`, and the manifest carries no detector-specific entry
