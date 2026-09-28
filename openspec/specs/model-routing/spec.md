# model-routing Specification

## Purpose

Keep each command wrapper's default model current and declared in one place: the wrapper's own frontmatter.

## Requirements

### Requirement: The system SHALL maintain up-to-date model assignments in all command wrappers

Each command wrapper's YAML frontmatter `model` field SHALL reflect the currently recommended model for that command and harness. Model assignments are reviewed and updated as provider offerings change. The wrapper frontmatter is the sole authority for these defaults; no spec or README table SHALL independently pin them.

#### Scenario: A wrapper is invoked without a model override

- **WHEN** a Claude Code or opencode command wrapper is invoked
- **THEN** the system SHALL use the `model` declared in that wrapper's frontmatter

#### Scenario: A model assignment is updated

- **WHEN** a wrapper's recommended model changes
- **THEN** only that wrapper's frontmatter changes, and no README table or spec requires a matching edit
