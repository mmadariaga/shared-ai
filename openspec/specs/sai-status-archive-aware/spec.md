# sai-status-archive-aware Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.
## Requirements
### Requirement: panel renders archived changes as closed

When the target change is archived (located under `openspec/changes/archive/YYYY-MM-DD-{name}/`), the panel SHALL display the archive location and its archive date and SHALL note that the change is closed. For an archived change the panel SHALL NOT perform checkbox interpretation of `implementation.md` — it displays status only. Archive detection is now performed by the deterministic tool, which parses the archive directory name to extract the date without invoking the CLI on a non-live change name.

#### Scenario: archived change shows archive date and closed note
- **WHEN** `/sai-status <change-name>` runs on a change that lives under `openspec/changes/archive/`
- **THEN** the panel shows the archive path, the archive date parsed from the `YYYY-MM-DD-{name}` directory, and a note that the change is closed

#### Scenario: archived change skips checkbox interpretation
- **WHEN** the panel renders an archived change
- **THEN** it does not render a checked-vs-total implementation progress count and instead shows closed status only

#### Scenario: archive detection requires no CLI call
- **WHEN** `/sai-status <change-name>` runs on an archived change
- **THEN** the tool detects the archive directory, extracts the date from the directory name, and does not invoke `openspec status` on the non-live change name

