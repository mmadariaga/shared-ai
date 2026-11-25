# yaml-request-input Specification

## Purpose

TBD - created by archiving change yaml-request-input. Update Purpose after archive.

## Requirements

### Requirement: Request format detection for to-pr and to-backlog

`sai/tools/to-pr.js` and `sai/tools/to-backlog.js` SHALL read every request they receive through `--input-file` (or stdin) with one shared reader in `sai/tools/yaml-subset.js`: a request whose first non-blank character is `{` SHALL be read as JSON only, and any other request SHALL be read with the strict YAML subset that validates worker reports. A request that does not parse to a mapping of keys to values SHALL be rejected. A JSON request that the tools accepted before this change SHALL keep producing the same result.

#### Scenario: A YAML request is accepted

- **WHEN** `to-backlog.js query` receives an input file written as a YAML mapping with a quoted `title` and a `description: |` block scalar
- **THEN** the tool reads the request and processes it with the same fields a JSON request would carry

#### Scenario: Content starting with a brace is read as JSON only

- **WHEN** an input file whose first non-blank character is `{` holds invalid JSON
- **THEN** the tool fails with the JSON parse error and never attempts a YAML parse

#### Scenario: An existing JSON request keeps working

- **WHEN** `to-pr.js` or `to-backlog.js` receives a JSON request that it accepted before this change
- **THEN** the tool produces the same result as before, apart from the trailing line-break normalization of `title` and `description`

### Requirement: YAML subset rejection before any provider call

A YAML request with content outside the YAML subset (anchors, aliases, tags, duplicate keys, unexpected indentation) SHALL be rejected with an error that names its line, and the tool SHALL make no provider call for it. A block scalar line that is less indented than the first content line of the block SHALL be rejected with an error that names its line, so a truncated description is never published.

#### Scenario: A duplicate key is rejected with its line

- **WHEN** a YAML request repeats the `title` key
- **THEN** the tool fails with an error that names the line of the duplicate key and sends nothing to the provider

#### Scenario: A less-indented block scalar line is rejected

- **WHEN** a line inside a `description: |` block scalar is indented less than the first content line of the block
- **THEN** the tool fails with an error that names that line and publishes no description

### Requirement: Block scalar Markdown fidelity

The Markdown text inside a `|` block scalar SHALL reach the request unchanged: `#` headings, `-` list markers, `key: value` lines, and code fences inside the block SHALL be read as text, never as YAML structure or comments.

#### Scenario: Markdown structure inside a block scalar stays text

- **WHEN** a YAML request carries a `description: |` block scalar holding a `#` heading, a `-` list item, a `key: value` line, and a code fence
- **THEN** the parsed `description` holds those lines verbatim as text

### Requirement: Title and description type and trailing line breaks

Before any provider call, `to-pr.js` and `to-backlog.js` SHALL reject a `title` or `description` that is not a string with an error that names the field, so a value YAML reads as a number, a boolean, or null is never published converted. Both tools SHALL remove the trailing line breaks of `title` and `description` before they compute the approval binding and before they publish, whether the request arrived as YAML or as JSON, so the same text gives the same published value and the same approval binding in both formats.

#### Scenario: A numeric title is rejected as a wrong type

- **WHEN** a YAML request carries `title: 2026` unquoted
- **THEN** the tool fails with an error that names the `title` field as not a string and makes no provider call

#### Scenario: YAML and JSON give the same value and binding

- **WHEN** the same title and description arrive once as a YAML request with a `|` block scalar and once as a JSON request without the final line break
- **THEN** both requests yield the same `title` and `description` values and the same approval binding

### Requirement: Shared YAML subset module

The YAML subset parser SHALL live in the shared module `sai/tools/yaml-subset.js`, and `sai/tools/worker-report-validator.js` SHALL read worker reports through that module with unchanged behavior on worker reports.

#### Scenario: The validator reads worker reports through the shared module

- **WHEN** `worker-report-validator.js` validates a YAML worker report
- **THEN** it parses the report with the parser exported by `sai/tools/yaml-subset.js` and returns the same verdict as before the move

### Requirement: Instructions write requests as YAML

The `to-pr` skill (`skills/universal/to-pr/SKILL.md` and `description-format.md`) and the `to-backlog` provider instructions (`skills/universal/to-backlog/providers/*.md`) SHALL show a request that carries a title and a description as YAML in a `.yaml` file, with a quoted `title` and `description: |` as a block scalar, and SHALL state that JSON is still accepted. `sai/policies/tool-resolution.md` § Invocation SHALL state that a request carrying model-written free text may use the YAML subset, naming `to-pr.js` and `to-backlog.js`. Claude Code and opencode SHALL install the same files.

#### Scenario: The to-pr skill shows a YAML query request

- **WHEN** an agent reads `skills/universal/to-pr/SKILL.md` to run `query`
- **THEN** the example request is YAML with a quoted `title` and a `description: |` block scalar

#### Scenario: The tool-resolution policy names both tools

- **WHEN** an agent reads `sai/policies/tool-resolution.md` § Invocation
- **THEN** it states that the requests of `to-pr.js` and `to-backlog.js` may be written in the YAML subset
