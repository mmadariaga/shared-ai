# model-customizer-grouping Specification

## Purpose
TBD - created by archiving change reorder-model-customizer. Update Purpose after archive.

## Requirements

### Requirement: All checklist uses phased grouping
The All scope SHALL order targets as alphabetical agents, then a phased middle block in four fixed logical phases with a single blank separator row between phases, then alphabetical utilities after a blank. The four phases SHALL be discover/plan (sai-explore, sai-1-spec, sai-2-design), build (sai-build, sai-3-implement, sai-4-apply), review (sai-review, sai-5-review, sai-6-security, sai-7-performance, sai-8-accessibility), and close (sai-backfill, sai-archive, sai-merge) with backfill before archive as the explicit alphabetical exception. Future commands outside the fixed phases SHALL join the close phase alphabetically so the four groups never gain a fifth separator. The implementation SHALL suppress a separator when an adjacent group is empty, SHALL never emit a leading, trailing, or doubled blank, and SHALL keep single-family scopes flat with no separators. Separator rows SHALL be non-selectable: the navigator SHALL skip them during cursor movement, SHALL treat Space as a no-op on them, SHALL exclude them from Enter results, and SHALL ignore them for default selection and empty-confirm protection, and they SHALL never enter stable values, settings labels, or overrides.

#### Scenario: User opens the All checklist
- **WHEN** the user selects All at the scope screen
- **THEN** agents SHALL lead, the phased middle block SHALL replace per-command alphabetical blocks, utilities SHALL close after a blank, and leftover workers SHALL trail the close phase

#### Scenario: Grouped All table with blank rules
- **WHEN** the user selects All at the scope screen
- **THEN** single blanks SHALL separate phases, blank rules SHALL suppress-when-empty with no leading, trailing, or doubled blank and flat single-family scopes, and separators SHALL stay non-selectable with skip, Space no-op, and Enter, default-selection, empty-confirm, and stable-value exclusions

#### Scenario: All checklist shows four fixed phases in pipeline order
- **WHEN** the user selects All at the scope screen
- **THEN** the system SHALL present agents first, then the four phases in fixed order with one blank between phases, then utilities after one blank, with no stray blanks

#### Scenario: Future commands preserve four groups
- **WHEN** a command outside the fixed phases exists during All rendering
- **THEN** the system SHALL place it alphabetically inside the close phase with no additional separator group

### Requirement: Semantic worker pairing with orphan handling

The customizer SHALL pair sai-3-implement with ui, frontend, backend, infra, and other workers in registration order, retaining independent selection and model configuration. It SHALL pair sai-4-apply with RED then GREEN, sai-5-review with review then review-fix, and other mapped commands with their workers. Direct-build SHALL attach once behind sai-explore. sai-build and sai-review SHALL remain childless phase openers. Remaining orphan workers SHALL be alphabetical with sai-merge-worker last, excluding already attached workers. The commit worker SHALL remain separated from the commit utility by the phase/utilities blank.

#### Scenario: All checklist contains boundary cardinalities

- **WHEN** All contains multi-worker commands, lone commands/workers, and the split commit pair
- **THEN** sai-3 shows five registered planners, apply shows RED then GREEN, direct-build appears once, build/review remain childless, and remaining orphan ordering is preserved.

#### Scenario: Direct-build worker attaches to explore

- **WHEN** All contains sai-explore and its worker
- **THEN** sai-direct-build-worker follows sai-explore once with no orphan duplicate.

#### Scenario: Apply keeps RED-then-GREEN and orphans stay alphabetical with merge last

- **WHEN** All contains apply workers and lone workers
- **THEN** RED precedes GREEN and orphan workers remain alphabetical with merge last.

#### Scenario: Review-fix follows review worker in All

- **WHEN** All contains both review workers
- **THEN** review-fix immediately follows the review worker before sai-6-security.

#### Scenario: Either review worker absent shows without gaps

- **WHEN** only one review worker is present
- **THEN** only that worker is shown without empty or duplicate rows.

#### Scenario: Category workers are independently configurable

- **WHEN** Workers, All, presets, reset, or project-local configuration enumerates sai-3 workers
- **THEN** all five category workers are visible independently and use the existing per-harness customization mechanisms.
