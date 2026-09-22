# actionable-notices-summary Specification

## Purpose
TBD - created by archiving change install-feedback-cleanup. Update Purpose after archive.

## Requirements

### Requirement: Single final deduplicated notices block

The installer SHALL collect every actionable notice (verify block, migration notice, permission guidance, setup reminder lines, install commands) into one ordered collection during `main`, deduplicate identical lines keeping first occurrence order, and print the unique notices once in a single final block before the setup reminder. The removed generic CodeGraph wiring hint SHALL NOT be collected; per-layer CodeGraph recommendations remain eligible.

#### Scenario: Duplicate notices appear once
- **WHEN** the same actionable line is collected more than once during a run
- **THEN** the final block prints that line exactly once in first-seen order

#### Scenario: Fully-wired run prints no CodeGraph line
- **WHEN** the install flow runs with the `codegraph` binary, MCP wiring, and index all present
- **THEN** the final notices block contains no CodeGraph line at all

### Requirement: Deferred emission through the notices collection

The installer SHALL route `offerOpencodeInstall`, `offerCodegraphInstall`, `copyOpencodeConfig` merge messages, and the migration notice through `emitInstallerNotice`, so these paths append to the notices collection instead of printing inline when the collection is present. The removed generic CodeGraph wiring hint is no longer routed; `offerCodegraphInstall()` on the probe-pass branch appends nothing and returns silently.

#### Scenario: Offer output is deferred to the final block
- **WHEN** an install offer or merge path produces an actionable line while a notices collection is active
- **THEN** that line is appended to the collection and printed only in the final notices block

#### Scenario: Binary-present offer appends no CodeGraph line
- **WHEN** `offerCodegraphInstall()` runs with the binary present while a notices collection is active
- **THEN** no CodeGraph line is appended to the collection and nothing is printed for that branch

### Requirement: Clean closing with a single reminder

The installer SHALL print no stray blank lines from the deferred paths and SHALL print the shared setup reminder exactly once as the closing line after the notices block.

#### Scenario: Reminder closes the run once

- **WHEN** the install flow completes with any harness selection
- **THEN** the setup reminder is printed exactly once after the notices block with no repeated suggested commands
