# claude-default-preset-alignment Specification

## Purpose
Verify that all shipped Claude Code model and effort defaults match the selected unchanged OPUS preset, while detecting unintended changes to generated opencode configuration.

## Requirements

### Requirement: Regression coverage checks all 36 Claude Code preset roles

Alignment tests SHALL compare model and effort for all forty Claude OPUS preset roles against canonical sources and generated projections: three generic agents, fifteen commands, nineteen workers, and three utilities. Each category planner SHALL match the former implementation worker's settings. Explicit model/effort lines and matrix-derived managed-worker settings SHALL retain their checks.

#### Scenario: All role settings match the preset

- **WHEN** alignment checks all forty preset roles
- **THEN** it passes only when model, effort, and role-family counts match and all five category planners retain the former worker defaults.

#### Scenario: A model or effort differs or is absent

- **WHEN** canonical or generated settings mismatch or required model/effort lines are absent
- **THEN** the alignment regression test fails.

### Requirement: Regression coverage protects the reference preset

The test SHALL reconstruct the previous reference preset by removing frontend/backend/infra/other additions and renaming ui to sai-3-implementation-worker, then verify SHA-256 214fff330885f84ece7527632bbb5bdd2b940d813c623c866e2f2f308cc3752f. It SHALL require all five new planner settings to equal that prior worker's settings. The four excluded publication/backlog command entries SHALL remain absent.

#### Scenario: Reference preset changes

- **WHEN** reconstructed prior preset bytes or identical planner settings differ from the reference
- **THEN** the reference-protection assertion fails.

#### Scenario: Excluded commands remain outside the preset

- **WHEN** reference command membership is checked
- **THEN** to-pr, to-backlog, from-backlog, and from-next-backlog-item remain absent.

### Requirement: Regression coverage protects generated opencode output

The test SHALL fingerprint normalized, sorted generated opencode agent/command/configuration paths and complete contents. It SHALL require forty-five entries with five category agents. Excluding those five agents and sai-3-implement, sai-build, and sai-explore wrappers, the thirty-seven unaffected entries SHALL retain SHA-256 ae95c53c1bb9706aafa51eb5fde3f1ccca6a000f6e9b4bfa3d088d286eca551d. Changed implementation surfaces SHALL remain covered by routing, permissions, handshake, defaults, and reference-projection tests.

#### Scenario: Claude Code defaults change without changing opencode output

- **WHEN** generated output is checked with the category-routing changes applied
- **THEN** all unaffected opencode path/content bytes retain the recorded fingerprint.

#### Scenario: Generated opencode output changes

- **WHEN** an unaffected generated opencode path or content changes
- **THEN** the unchanged-output assertion fails rather than accepting a count-only replacement.
