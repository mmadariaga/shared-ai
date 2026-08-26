# opencode-change-arg-passthrough Specification

## Purpose

Define the opencode wrapper contract that forwards command arguments through the invocation envelope without relying on transcript text or labelled wrapper lines.

## Requirements
### Requirement: opencode change-consuming wrappers forward an envelope

Every opencode wrapper for a change-consuming `sai-*` command SHALL contain one standalone `InvocationEnvelope:` block directly after the launcher-call directive. The block SHALL contain exactly `command_name` and `arguments_value`, in that order. Opencode SHALL substitute `$ARGUMENTS` into `arguments_value`; a trimmed, non-empty value SHALL be authoritative. The wrapper SHALL be label-free, have no trailing content after the envelope block, and preserve its frontmatter byte-for-byte.

#### Scenario: sai-archive wrapper forwards the envelope
- **WHEN** the opencode `sai-archive` wrapper is read
- **THEN** its body ends with exactly one `InvocationEnvelope:` block containing only `command_name` and `arguments_value`, with no trailing labelled line

#### Scenario: all nine change-consuming wrappers use the same label-free shape
- **WHEN** the nine opencode change-consuming wrapper files are listed (`commands/opencode/sai-2-design.md`, `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md`, `sai-archive.md`, `sai-pr.md`)
- **THEN** each one has exactly the two envelope keys, forwards `$ARGUMENTS` through `arguments_value`, and contains no labelled change-name line or other trailing content

#### Scenario: change-picker uses arguments value
- **WHEN** a user runs `/sai-archive installer-offer-opencode-cli` in opencode
- **THEN** opencode substitutes the value into `arguments_value`, the invocation envelope reaches the change-picker, and the trimmed `arguments_value` resolves `installer-offer-opencode-cli` without showing the picker

### Requirement: non-change-consuming opencode wrappers do not provide a change name

Opencode wrappers for non-change-consuming SAI commands (`sai-1-spec`, `sai-backfill`, `sai-commit`, and `sai-explore`) SHALL NOT provide a change-name source to the change-picker. The retired `budget` wrapper is not part of this wrapper set. Behavior SHALL remain independent of opaque wrapper data, transcript text, and labelled wrapper lines.

#### Scenario: sai-1-spec wrapper does not provide a change name

- **WHEN** `~/.config/opencode/commands/sai-1-spec.md` is read
- **THEN** the wrapper body does not provide a change-name value for the picker

#### Scenario: sai-backfill wrapper does not provide a change name

- **WHEN** `~/.config/opencode/commands/sai-backfill.md` is read
- **THEN** the wrapper body does not provide a change-name value for the picker

#### Scenario: sai-explore body does not consume a change name

- **WHEN** the `sai/commands/explore/body.md` body file (fetched by the `sai-explore` wrapper) is read
- **THEN** it does not include `Fetch @sai/instructions/change-picker.md` and does not validate `$ARGUMENTS` as an OpenSpec change name — even though the `commands/opencode/sai-explore.md` description frontmatter says "Optionally pass a change name to explore an existing change", the actual behavior is that `sai-explore` does not consume a change name. The description text is a known inconsistency deferred to a follow-up change.

#### Scenario: Opencode non-change-consuming wrappers remain label-free

- **WHEN** the maintained non-change-consuming opencode wrappers are inspected
- **THEN** they provide no change-name source and the deleted `budget` wrapper is absent from the inventory.

### Requirement: the envelope contract is opencode-specific and is not transcript-dependent

The opencode invocation-envelope adapter addresses opencode's wrapper substitution boundary. Other harnesses may substitute arguments directly into their body or use their own envelope path, but no supported harness SHALL depend on a transcript line or labelled wrapper text for change-name resolution. The shared change-picker contract remains authoritative: trimmed non-empty `arguments_value` wins, and the 0/1/N fallback runs only when it is empty.

#### Scenario: Claude Code and Copilot remain independent of wrapper labels

- **WHEN** the corresponding Claude Code or GitHub Copilot change-consuming command is invoked
- **THEN** its change-name behavior does not require a labelled wrapper line and remains governed by that harness's argument substitution and the shared envelope semantics

### Requirement: future change-consuming opencode wrappers forward the envelope

Any new opencode wrapper for a change-consuming `sai-*` command introduced in the future SHALL use the same standalone `InvocationEnvelope:` block directly after its launcher call, with exactly `command_name` and `arguments_value`. It SHALL forward `$ARGUMENTS` through `arguments_value`, preserve frontmatter, and SHALL NOT add a labelled wrapper line.

#### Scenario: new change-consuming opencode wrapper follows the envelope convention
- **WHEN** a new change-consuming `sai-*` command (for example `sai-9-something`) is added and its opencode wrapper is written
- **THEN** the wrapper supplies the exact two-key envelope and the change-picker can resolve a trimmed non-empty `arguments_value` without transcript or label extraction
