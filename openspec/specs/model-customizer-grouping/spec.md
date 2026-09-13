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
The pairing SHALL place sai-4-apply with both sai-4-red-worker and sai-4-green-worker in RED-then-GREEN order, pair every other mapped command with its single worker, and leave unmapped commands alone in phase position. The pairing SHALL attach sai-direct-build-worker directly behind sai-explore as a single occurrence and SHALL leave no duplicate in the orphan group. Commands sai-build and sai-review SHALL stay childless and open the build and review phases respectively. The pairing SHALL list remaining orphan workers alphabetically trailing the close phase with sai-merge-worker last; sai-commit-worker stays separated from the commit utility row by the phase/utilities blank separator.

#### Scenario: All checklist contains boundary cardinalities
- **WHEN** the All list includes a two-worker command, lone commands, lone workers, and the split commit pair
- **THEN** apply SHALL show both workers in RED-then-GREEN order, direct-build SHALL attach once with no orphan duplicate, build and review SHALL stay childless, and remaining orphans SHALL stay alphabetical with sai-merge-worker last

#### Scenario: Direct-build worker attaches to explore
- **WHEN** the All list includes sai-explore and its worker
- **THEN** the system SHALL show sai-direct-build-worker immediately behind sai-explore once and SHALL show no duplicate in the orphan group

#### Scenario: Apply keeps RED-then-GREEN and orphans stay alphabetical with merge last
- **WHEN** the All list includes the two-worker apply command and lone workers
- **THEN** the system SHALL show both apply workers in RED-then-GREEN order and SHALL list orphan workers alphabetically with sai-merge-worker last

