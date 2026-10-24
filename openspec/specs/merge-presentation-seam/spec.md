# merge-presentation-seam Specification

## Purpose
Defines the coordinator-owned presentation boundary for merge lifecycle output: the two presentation channels, gate rendering, strategy presentation, resolution-payload validation before staging, the adaptive progress surface, and terminal rendering.

## Requirements

### Requirement: Merge has no presentation seam

`/sai-merge` SHALL have no presentation seam: `sai/commands/merge/presentation.md` SHALL be retired with a retirement entry in `sai/install-manifest.json`, the coordinator SHALL hold no pinned per-stage texts, and its closing report SHALL be defined by goals in `sai/commands/merge/coordinator.md` and written in the chat language.

#### Scenario: Presentation file is retired

- **WHEN** the install manifest is read
- **THEN** it carries a retirement entry for `commands/merge/presentation.md` and no active projection of it
