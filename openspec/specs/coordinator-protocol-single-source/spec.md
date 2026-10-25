# Coordinator Protocol Single Source Specification

## Purpose

Define the single-sourced lifecycle and result-loop protocol consumed by the seven routed phase coordinators, so the shared closed-outcome, changed-file, reconstruction, and progress-event mechanics live in the shared Orchestration Core contracts instead of being restated per phase.

## Requirements

### Requirement: Single-source technical instruction ownership

The coordinator cards SHALL retain only routing and adapter responsibilities, while `worker.md`, `steps/common.md`, and the coordinator-selected step file SHALL provide the authoritative technical instruction surface without duplicated lifecycle or planning guidance.

#### Scenario: Active worker instruction surface is loaded

- **WHEN** the routed implementation worker begins technical execution
- **THEN** it follows the common baseline and selected step instructions while the coordinator handles lifecycle routing separately.

### Requirement: Coordinator safety literals remain unchanged and isolation lives in the wrappers

Each coordinator's MANDATORY STOP literal SHALL remain byte-for-byte identical. Clean-session enforcement SHALL NOT live in the coordinator or body cards: no card under `sai/commands/` carries a `# Isolation Mode` block or an inline clean-session sentence, and every command wrapper (`commands/claude/sai-*.md` and `commands/opencode/sai-*.md`) except `sai-context-cache-ttl-benchmark.md`, which deliberately runs in the current conversation, carries the byte-identical clean-start line "This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise." before its card fetch, as the sole mechanism that discards prior conversational context at invocation start.

#### Scenario: safety literals survive the boot retirement

- **WHEN** the coordinator cards are compared before and after the boot adapters are deleted
- **THEN** the MANDATORY STOP literal in each coordinator is byte-identical to its prior content

#### Scenario: isolation enforcement lives in the wrappers only

- **WHEN** any card under `sai/commands/` and any `sai-*` wrapper of either harness other than `sai-context-cache-ttl-benchmark.md` is read
- **THEN** no card contains a `# Isolation Mode` block or an inline clean-session sentence
- **AND** every wrapper carries the byte-identical clean-start line before its card fetch
