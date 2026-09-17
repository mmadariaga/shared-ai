# actionable-notices-summary Specification

## Purpose
TBD - created by archiving change install-feedback-cleanup. Update Purpose after archive.

## Requirements

### Requirement: Single final deduplicated notices block

The installer SHALL collect every actionable notice (verify block, migration notice, permission guidance, setup reminder lines, wiring hint, install commands) into one ordered collection during `main`, deduplicate identical lines keeping first occurrence order, and print the unique notices once in a single final block before the setup reminder.

#### Scenario: Duplicate notices appear once

- **WHEN** the same actionable line is collected more than once during a run
- **THEN** the final block prints that line exactly once in first-seen order

### Requirement: Deferred emission through the notices collection

The installer SHALL route `offerOpencodeInstall`, `offerCodegraphInstall`, `copyOpencodeConfig` merge messages, the migration notice, and the CodeGraph wiring hint through `emitInstallerNotice`, so these paths append to the notices collection instead of printing inline when the collection is present.

#### Scenario: Offer output is deferred to the final block

- **WHEN** an install offer or merge path produces an actionable line while a notices collection is active
- **THEN** that line is appended to the collection and printed only in the final notices block

### Requirement: Clean closing with a single reminder

The installer SHALL print no stray blank lines from the deferred paths and SHALL print the shared setup reminder exactly once as the closing line after the notices block.

#### Scenario: Reminder closes the run once

- **WHEN** the install flow completes with any harness selection
- **THEN** the setup reminder is printed exactly once after the notices block with no repeated suggested commands
