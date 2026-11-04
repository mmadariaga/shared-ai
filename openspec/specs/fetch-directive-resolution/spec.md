# fetch-directive-resolution Specification

## Purpose
TBD - created by archiving change wrap-instruction-references-in-code-spans. Update Purpose after archive.

## Requirements

### Requirement: Both fetch skills SHALL resolve a backticked directive exactly like the bare form

`skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` SHALL state that a `Fetch` or `Also fetch` directive whose path sits inside an inline code span is the same directive as the bare form, and SHALL resolve the path inside the span by the same resolution rows. Each skill's resolution table SHALL show the backticked form beside the bare form for the `@skills/<name>/SKILL.md` rows and for the any-other-subpath row.

#### Scenario: Backticked skill directive uses the skill tool

- **WHEN** an instruction contains ``Fetch `@skills/budget/SKILL.md` ``
- **THEN** the fetch skill of the active harness loads skill `budget` through its skill tool, exactly as for `Fetch @skills/budget/SKILL.md`

#### Scenario: Backticked subpath directive uses the fetch tool

- **WHEN** an instruction contains ``Fetch `@sai/policies/remember.md` and follow it exactly.``
- **THEN** the fetch skill resolves `sai/policies/remember.md` through its fetch tool, exactly as for the bare form

#### Scenario: Backticked Also fetch directive resolves the same way

- **WHEN** an instruction contains ``Also fetch `@sai/policies/remember.md` ``
- **THEN** the fetch skill resolves it by the same row as the bare `Also fetch @sai/policies/remember.md`

### Requirement: The doctor SHALL read a backticked fetch directive as the same reference as the bare form

The doctor's fetch-reference parser SHALL accept an optional backtick between `Fetch` or `Also fetch` and the `@` path, and SHALL extract the same reference path from the backticked and the bare forms, without the closing backtick or trailing punctuation.

#### Scenario: Backticked and bare directives yield the same references

- **WHEN** the doctor parses ``Fetch `@sai/commands/commit/coordinator.md` and follow it exactly.`` and `Fetch @sai/policies/public-chat.md and follow it exactly.`
- **THEN** it extracts `sai/commands/commit/coordinator.md` and `sai/policies/public-chat.md`
