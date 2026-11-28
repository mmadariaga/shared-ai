# fetch-directive-resolution Specification

## Purpose
TBD - created by archiving change wrap-instruction-references-in-code-spans. Update Purpose after archive.

## Requirements

### Requirement: Both fetch skills SHALL resolve a backticked directive exactly like the bare form

`skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` SHALL state that a `Fetch`, `Also fetch`, `Fetch?`, or `Also fetch?` directive whose path sits inside an inline code span is the same directive as the bare form, and SHALL resolve the path inside the span by the same resolution rows. Each skill's resolution table SHALL show the backticked form beside the bare form for the `@skills/<name>/SKILL.md` rows and for the any-other-subpath row, and SHALL show the marked `Fetch?` and `Also fetch?` forms beside their unmarked rows. The `?` marker SHALL sit directly after the verb and SHALL record that the directive is conditional.

#### Scenario: Backticked skill directive uses the skill tool

- **WHEN** an instruction contains ``Fetch `@skills/budget/SKILL.md` ``
- **THEN** the fetch skill of the active harness loads skill `budget` through its skill tool, exactly as for `Fetch @skills/budget/SKILL.md`

#### Scenario: Backticked subpath directive uses the fetch tool

- **WHEN** an instruction contains ``Fetch `@sai/policies/remember.md` and follow it exactly.``
- **THEN** the fetch skill resolves `sai/policies/remember.md` through its fetch tool, exactly as for the bare form

#### Scenario: Backticked Also fetch directive resolves the same way

- **WHEN** an instruction contains ``Also fetch `@sai/policies/remember.md` ``
- **THEN** the fetch skill resolves it by the same row as the bare `Also fetch @sai/policies/remember.md`

#### Scenario: Backticked marked directive resolves the same way

- **WHEN** an instruction contains ``Fetch? `@sai/policies/obstacle-escalation.md` ``
- **THEN** the fetch skill resolves `sai/policies/obstacle-escalation.md` through its fetch tool exactly as for the unmarked form, and reads it only when its condition holds

### Requirement: The doctor SHALL read a backticked fetch directive as the same reference as the bare form

The doctor's fetch-reference parser SHALL accept an optional backtick between `Fetch` or `Also fetch` and the `@` path, an optional `?` marker directly after the verb, and the lowercase `fetch` form, and SHALL extract the same reference path from the backticked and the bare forms, without the closing backtick or trailing punctuation. It SHALL create no reference from a word that merely embeds the verb.

#### Scenario: Backticked and bare directives yield the same references

- **WHEN** the doctor parses ``Fetch `@sai/commands/commit/coordinator.md` and follow it exactly.`` and `Fetch @sai/policies/public-chat.md and follow it exactly.`
- **THEN** it extracts `sai/commands/commit/coordinator.md` and `sai/policies/public-chat.md`

#### Scenario: Marked and lowercase directives yield the same references

- **WHEN** the doctor parses ``Fetch? `@sai/policies/obstacle-escalation.md` ``, ``Otherwise fetch `@commands/sai-<name>.md`.``, and `The prefetch @sai/policies/c.md stays text.`
- **THEN** it extracts `sai/policies/obstacle-escalation.md` and `commands/sai-<name>.md`, and creates no reference from the embedded word

### Requirement: A conditional directive carries the ? marker directly after its verb

Every directive in the installed instruction files SHALL carry a marker that matches its true load condition: a conditional directive SHALL carry the `?` marker directly after the verb, with only its path in the inline code span, and SHALL be read only when the condition stated in its paragraph or its `##` section holds; an unmarked directive SHALL stay required. Conditionality SHALL be the author's semantic decision, and the `fetch-directives` check SHALL validate form only, deciding neither that a marked directive lacks a condition nor that an unmarked directive sits under a conditional section. A directive inline in a conditional sub-case SHALL stand on its own line. The instruction files SHALL use one verb form (`Fetch` or `Also fetch`); the three lowercase `fetch @` directives SHALL be normalized to `Fetch?`, each gated by a stated branch or step. The specs that require `worker-report-transport` unconditionally SHALL remain the source of truth, and the cards SHALL align with them.

#### Scenario: marked subpath directive resolves through the fetch tool

- **WHEN** an instruction contains a marked directive for `sai/policies/worker-report-transport.md` and its condition holds
- **THEN** the fetch skill resolves the subpath through its fetch tool

#### Scenario: marked skill directive loads the skill

- **WHEN** an instruction contains a marked directive for `skills/from-backlog/SKILL.md` and its condition holds
- **THEN** the fetch skill loads the `from-backlog` skill with the harness skill tool, exactly as for its unmarked form

#### Scenario: the marker sits directly after the verb

- **WHEN** an instruction writes `Fetch ? @sai/policies/example.md` or places the whole directive phrase in a code span
- **THEN** the `fetch-directives` lint check reports a directive-form violation

#### Scenario: an inline conditional directive stands on its own line

- **WHEN** a conditional directive is embedded in a longer conditional sub-case sentence
- **THEN** it is written on its own line with its `?` marker and only its path in the code span

#### Scenario: a required directive stays unmarked

- **WHEN** a directive is needed by every run of its card
- **THEN** it is written without the `?` marker and the tree counts it as required

#### Scenario: a form-only lint leaves a classified directive alone

- **WHEN** a marked directive's paragraph states no condition, or an unmarked directive sits under a conditional section
- **THEN** the `fetch-directives` check reports no violation and the review owns the classification
