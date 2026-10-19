# ready-to-propose-detection Specification

## Purpose
TBD - created by archiving change ready-to-propose-detector. Update Purpose after archive.

## Requirements

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

### Requirement: Deterministic stdin detector with loose, strict, and dispatchable profiles

The repository SHALL provide `sai/tools/ready-to-propose.js` with the sub-command `check --profile loose|strict|dispatchable`. It SHALL read the text to check from stdin, SHALL accept one or more blocks, and SHALL always print exactly one JSON verdict carrying `ok`, `profile`, `names`, `blocks` (each with `index`, `line`, `name`, and `violations`), and set-level `violations`; the `dispatchable` verdict SHALL additionally carry per-block `hash` and `flagged` and set-level `flagged`, `judgment`, and `dispatchable`. For `loose` and `strict` it MUST exit 0 when the text is valid for the profile and 1 when violations are found; for `dispatchable` it MUST exit 0 only when `dispatchable` is true and 1 otherwise; it MUST exit 2 on a usage or I/O error. `--json` SHALL be accepted and change nothing, and the tool SHALL take no `--cwd`.

#### Scenario: Valid text on stdin yields a JSON verdict and exit 0
- **WHEN** a canonical block is piped to `check --profile strict`
- **THEN** the tool prints one JSON verdict with `"ok": true` and the extracted change name, and exits 0

#### Scenario: Usage errors exit 2
- **WHEN** the tool runs without the `check` sub-command, without `--profile`, or with an unknown profile or flag
- **THEN** it writes a usage message to stderr and exits 2

#### Scenario: Dispatchable exit follows dispatchability
- **WHEN** a structurally valid block with an unjudged flagged line is piped to `check --profile dispatchable`
- **THEN** the verdict carries `"ok": true` and `"dispatchable": false`, and the tool exits 1

### Requirement: Convert sub-command builds a draft block from an issue

`sai/tools/ready-to-propose.js` SHALL provide `convert [--change-name <name>] [--declared-clean]`, reading an issue description from stdin as Markdown or HTML and printing one JSON object. HTML comments SHALL be removed before parsing and SHALL never carry block content. The result SHALL report `ready_to_propose_form` (true only when the `Maturity` section reads `Ready to propose`) and `proposed_change_name` derived from the `Goal`. For an issue without the form, the tool SHALL return no block and exit 0. For an issue with the form, the tool SHALL build the block from the issue's own text, map `Goal`, `Problem`, `Scope`, `Research leads`, `Decisions`, `Non-goals`, `Edge cases`, and `Implementation notes` to their block fields, write `- None` in every field without a source, keep the `E` and `I` items literal, and validate the block with the `dispatchable` profile. It SHALL reject the conversion, exiting 1 with `rejections`, when the issue has entries in `Open questions`, lacks a mandatory section, has an empty `Problem`, `Goal`, or `Scope`, has a scope item that does not read as a verifiable capability, has an `E` or `I` item without its identifier, or fails the `dispatchable` profile. `--declared-clean` SHALL add a `Request Additional Notes` line stating that the user declared no drift without validating it. A missing flag value SHALL be a usage error exiting 2.

#### Scenario: Ready to Propose issue converts

- **WHEN** an issue whose `Maturity` reads `Ready to propose` and whose sections are complete is piped to `convert`
- **THEN** the tool returns a `dispatchable` block with literal `E`/`I` lists and `- None` in every unsourced field, and exits 0

#### Scenario: HTML issue converts like Markdown

- **WHEN** the same issue is piped as HTML containing an HTML comment
- **THEN** the tool returns the same block and the comment's content appears nowhere in it

#### Scenario: Open questions reject the conversion

- **WHEN** a Ready to Propose issue still has entries in `Open questions`
- **THEN** the tool returns `converted: false` with a rejection and exits 1

#### Scenario: Issue without the form returns no block

- **WHEN** an issue whose `Maturity` is not `Ready to propose` is piped to `convert`
- **THEN** the tool returns `ready_to_propose_form: false`, no block, and exits 0

### Requirement: Issue format constants match the policy

The `convert` sub-command SHALL hold the issue sections and `Maturity` values as constants, and a test SHALL check that they match `sai/policies/issue-format.md`. `sai/policies/tool-resolution.md` SHALL document the `convert` invocation shape.

#### Scenario: Constants agree with the policy

- **WHEN** the regression test reads the tool constants and the issue format policy
- **THEN** the mandatory sections, optional sections, and `Maturity` values match
