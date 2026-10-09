# claude-worker-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.

## Requirements

### Requirement: Reasoning worker seed defaults

The worker-matrix Claude Code seeds for sai-2-design-worker and sai-direct-build-worker SHALL declare model sonnet with effort high. The sai-4-green-worker seed SHALL declare model haiku with effort xhigh. The sai-backfill-worker and sai-merge-worker seeds SHALL declare model opus with effort medium. These settings SHALL match the corresponding worker entries in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Reasoning worker seed is observed
- **WHEN** the installer reads the sai-backfill-worker claudeAgent entry from sai/install-manifest.json
- **THEN** it materializes model opus with effort medium

#### Scenario: Design and direct implementation worker seeds are observed
- **WHEN** the installer materializes the Claude Code sai-2-design-worker and sai-direct-build-worker agents from the worker matrix
- **THEN** both agents declare model sonnet with effort high

#### Scenario: GREEN worker seed is observed
- **WHEN** the installer materializes the Claude Code sai-4-green-worker agent from the worker matrix
- **THEN** it declares model haiku with effort xhigh

#### Scenario: Merge worker seed is observed
- **WHEN** the installer materializes the Claude Code sai-merge-worker agent from the worker matrix
- **THEN** it declares model opus with effort medium

### Requirement: Balanced worker seed defaults

The worker-matrix Claude Code seeds for sai-commit-worker, sai-archive-worker, and sai-4-red-worker SHALL declare model haiku with effort medium, matching their worker entries in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Balanced worker seed is observed
- **WHEN** the installer reads the sai-4-red-worker claudeAgent entry from sai/install-manifest.json
- **THEN** it materializes model haiku with effort medium

#### Scenario: Commit and archive worker factory seeds are observed
- **WHEN** the installer materializes the Claude Code sai-commit-worker and sai-archive-worker agents from the worker matrix
- **THEN** both agents declare model haiku with effort medium

### Requirement: Remaining worker seeds match the selected OPUS preset

The worker-matrix Claude Code seed for sai-1-spec-proposal-worker SHALL declare model sonnet with effort high. The sai-review-fix-worker seed SHALL declare model haiku with effort medium. The sai-3-implementation-worker, sai-5-review-worker, sai-6-security-worker, sai-7-performance-worker, and sai-8-accessibility-worker seeds SHALL declare model opus with effort medium. These settings SHALL match their worker entries in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Spec proposal worker seed is observed
- **WHEN** the installer materializes the Claude Code sai-1-spec-proposal-worker agent from the worker matrix
- **THEN** it declares model sonnet with effort high

#### Scenario: Review correction worker seed is observed
- **WHEN** the installer materializes the Claude Code sai-review-fix-worker agent from the worker matrix
- **THEN** it declares model haiku with effort medium

#### Scenario: Implementation planning and audit worker seeds are observed
- **WHEN** the installer materializes the Claude Code sai-3-implementation-worker, sai-5-review-worker, sai-6-security-worker, sai-7-performance-worker, and sai-8-accessibility-worker agents from the worker matrix
- **THEN** all five agents declare model opus with effort medium
