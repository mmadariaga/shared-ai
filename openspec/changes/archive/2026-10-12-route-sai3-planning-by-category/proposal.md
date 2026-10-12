> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Users need to configure suitable models and skills for different kinds of planning through project-local agent overrides. Existing tasks.md categories now select five independently configurable planners instead of one implementation worker.

## What Changes

- **BREAKING**: Replace the active sai-3-implementation-worker and implementation-worker binding with ui, frontend, backend, infra, and other planning roles and bindings.
- Route frontend-ui to ui, frontend-code to frontend, backend and data to backend, infra to infra, and docs and other to other.
- Move change resolution, common analysis, documentation, shared authorization, rerun preparation, integration, and final verification to the coordinator.
- Dispatch required workers concurrently after ready handshakes; each receives all assigned Steps in one complete task and writes only its independent temporary plan part.
- Verify current inputs, ownership, coverage, numbering, ordering, interfaces, dependencies, and final-plan checks before publishing implementation.md.
- Retain valid sibling results and the previous final plan on failure; clean only exact owned temporary files after verified successful publication.
- Install five identical-default managed planning agents for Claude Code and opencode and expose them independently in the model customizer and shipped presets.
- Reuse this coordinator in sai-build and Plan - Unattended without an implement worker step machine.
- Document routing, configuration, temporary artifacts, failure handling, and unchanged sai-4 boundaries.
- Keep the deprecated CLAUDE_IMPLEMENTATION_WORKER_AGENT export as compatibility metadata, not as a routing fallback.
- Preserve legacy retirement safety and byte-level checks for unaffected projections.

## Capabilities

### New Capabilities

- `category-planning-agents`: Fixed category routing, identical initial planning agents, project-local customization, and named resource failures.
- `temporary-plan-integration`: Run/input identity, complete part assembly, semantic verification, guarded publication, and exact owned-file cleanup.
- `isolated-worker-failures`: Independent concurrent-worker outcomes and recovery without sibling cancellation or partial publication.
- `planning-documentation`: Coordinated command, configuration, and workflow documentation for both harnesses.

### Modified Capabilities

- `implementation-planning-worker`: Assigned-Step planning replaces sole-worker phase ownership.
- `implementation-coordinator`: Technical common work, parallel scheduling, and final publication become coordinator-owned.
- `implementation-harness-bindings`: Five category bindings and managed agents replace the single implementation binding.
- `implementation-role-registration-seam`: Register the ordered five-role implementation roster.
- `existing-installation-equivalence`: Update rendered-artifact counts and sai-3 grouping while protecting unaffected destination/content bytes against the implemented baseline.
- `worker-matrix-collapse`: Materialize nineteen workers per harness and safely retire the former single-worker destinations.
- `claude-default-preset-alignment`: Cover forty Claude preset roles and protect unaffected opencode output bytes.
- `model-customizer-grouping`: Pair sai-3 with five independently selectable planning workers.
- `sai-tools-distribution`: Register the new planning-parts runtime tool.
- `implement-standalone-loading`: Retain the old machine as compatibility data rather than a live planning schedule.
- `implement-steps-library`: Share technical rules between coordinator common work and complete category tasks.
- `implement-progress-plan`: Keep six milestones with coordinator-authored completion observations.
- `implement-worker-active-step-execution`: Replace worker active-step pointers with complete assigned-Step tasks.
- `sai-build-registration`: Reuse the category-planning bootstrap and coordinator in the chained implement segment.

## Impact

- New runtime tool: sai/tools/planning-parts.js.
- Modified coordination: sai/commands/implement/command-bootstrap.md, coordinator.md, worker.md, steps/common.md, and steps/collapse-implemented-steps.md.
- Modified composition: sai/commands/meta-build/command-bootstrap.md and coordinator.md.
- Modified installation and configuration: bin/implementation-worker-roles.js, bin/install-flow.js, bin/model-customization.js, sai/install-manifest.json, and shipped Claude Code/opencode presets.
- Modified shared contracts: sai/orchestration/command-runner.md and sai/policies/todo-structure.md.
- Modified documentation: README.md, AGENTS.md, docs/commands/sai-3-implement.md, and docs/models.md.
- New regression fixtures/tests: fixtures/implementation-projections-7112f07.json, test/category-planning-parts.test.js, and test/implementation-role-retirement.test.js; existing installation, customization, lifecycle, and projection tests were updated.
- Workers still plan rather than implement production code. sai-4, RED/GREEN routing, and the final implementation.md format remain unchanged.
- Remaining costs are coordinator complexity, concurrent resources, and temporary-file management. Specialization is project-configured rather than supplied through specialty defaults.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Existing tracking issue: https://github.com/mmadariaga/shared-ai/issues/91. Its published description still records the earlier single-change delivery choice; updating it requires separate publication approval.

## Proposal Research Documentation

- sai/commands/implement/coordinator.md
- sai/commands/implement/worker.md
- sai/tools/planning-parts.js
- bin/implementation-worker-roles.js
- sai/install-manifest.json
- bin/model-customization.js
- docs/commands/sai-3-implement.md
- docs/models.md
- Existing implementation ownership, registration, bindings, matrix, customization, loading, progress, and build capability specifications.
- Selected staged diff: 59 files, 1783 insertions, 1727 deletions.

## Additional Notes

The supplied composition evidence reports a converged functional review after one correction round and an independent suite with 2371 tests: 2366 passed, 5 skipped, and no failures. This backfill preparation did not rerun that suite or modify main specifications.
