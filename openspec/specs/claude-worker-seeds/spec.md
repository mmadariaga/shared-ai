# claude-worker-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.
## Requirements
### Requirement: Reasoning worker seeds use opus with medium effort
The worker-matrix claudeAgent entries for reasoning-intensive workers SHALL declare model opus with effort medium. This covers sai-2-design-worker normalized from opus/high and sai-backfill-worker, sai-merge-worker, sai-4-green-worker, and sai-direct-build-worker moved from haiku/low.
#### Scenario: Reasoning worker seed is observed
- **WHEN** the installer reads the sai-backfill-worker claudeAgent entry from sai/install-manifest.json
- **THEN** it materializes model opus with effort medium

### Requirement: Balanced worker seeds use sonnet with medium effort
The worker-matrix claudeAgent entries for balanced workers SHALL declare model sonnet with effort medium. This covers sai-commit-worker, sai-archive-worker, and sai-4-red-worker moved from haiku/low.
#### Scenario: Balanced worker seed is observed
- **WHEN** the installer reads the sai-4-red-worker claudeAgent entry from sai/install-manifest.json
- **THEN** it materializes model sonnet with effort medium

