# merge-resolution-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-merge. Update Purpose after archive.

## Requirements

### Requirement: Merge worker results travel as run-directory files

The merge coordinator SHALL open no `transfer.js` directory and the `merge-command` profile SHALL carry no `transfer.js` shell grant. The merge worker SHALL write each step report to a path in the run directory named in its brief and return only that path, and the coordinator SHALL check an apply report with `merge.js resolution --source <report>` and give a replacement worker a hand-over file instead of reconstruction fields.

#### Scenario: Apply report is checked from its path

- **WHEN** the worker returns the path of an apply report
- **THEN** the coordinator passes that path to `merge.js resolution --source` and opens no transfer directory
