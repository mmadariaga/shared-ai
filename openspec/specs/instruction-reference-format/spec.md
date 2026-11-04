# instruction-reference-format Specification

## Purpose
TBD - created by archiving change wrap-instruction-references-in-code-spans. Update Purpose after archive.

## Requirements

### Requirement: Installed instruction files SHALL write every reference inside an inline code span

Outside fenced code blocks, every token that starts with `@sai/`, `@skills/`, or `@commands/` in a Markdown file under `sai/`, `skills/`, `commands/`, or `agents/` SHALL sit inside an inline code span, whether it is part of a `Fetch` or `Also fetch` directive or a prose mention. Only the path token SHALL sit in the span: the directive verb, the following text, and trailing anchors such as `§ Section` SHALL stay outside it. Text below the `<!-- User customizations below this line -->` marker of a wrapper SHALL be outside this rule. The opencode wrapper bootstrap line `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` is not a reference and SHALL stay bare.

#### Scenario: A fetch directive wraps only its path

- **WHEN** an installed instruction file loads `sai/policies/remember.md` through a fetch directive
- **THEN** the line reads ``Fetch `@sai/policies/remember.md` `` followed by any trailing text outside the code span

#### Scenario: A prose mention is wrapped

- **WHEN** an installed instruction file names a reference in ordinary prose, outside any directive
- **THEN** the reference token sits inside an inline code span

#### Scenario: The opencode bootstrap line stays bare

- **WHEN** an opencode command wrapper is read
- **THEN** its line `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` carries no code span

#### Scenario: User customizations are not rewritten

- **WHEN** a wrapper contains text below `<!-- User customizations below this line -->`
- **THEN** that text keeps its original form, with or without code spans

### Requirement: Generated worker bindings and dispatch prompts SHALL emit the backticked reference form

The worker-matrix generator SHALL produce the canonical worker-contract fetch line of each worker binding as ``Fetch `@<worker-contract>` and follow it exactly.``, and the installer SHALL validate each worker's initial dispatch prompt against ``Worker contract: Fetch `@<worker-contract>` and follow it exactly.`` followed by the unchanged ready-only text.

#### Scenario: Worker matrix emits a backticked canonical fetch

- **WHEN** the worker matrix is materialized for a worker entry
- **THEN** the entry's canonical fetch line wraps the worker-contract path in an inline code span

#### Scenario: Installer expects a backticked dispatch prompt

- **WHEN** the installer computes the expected initial dispatch prompt of a managed worker
- **THEN** the prompt names the worker contract as ``Fetch `@<worker-contract>` `` inside the `Worker contract:` line

### Requirement: A reference inside a fenced code block SHALL name no existing file

A reference token inside a fenced code block of an installed instruction file SHALL NOT resolve to an existing repository file. A fenced example SHALL use a placeholder path (for example `@sai/<path>` or `@sai/commands/{name}/body.md`) or move the real reference into an inline code span outside the fence.

#### Scenario: Fenced placeholder reference is allowed

- **WHEN** a fenced code block in an installed instruction file contains `Fetch @sai/<path>`
- **THEN** the file conforms to the reference format
