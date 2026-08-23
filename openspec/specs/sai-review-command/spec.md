# sai-review-command Specification

## Purpose

Defines the `/sai-review` user-invoked routed composition command that runs the review phase and conditionally dispatches recommended audit phases as chained segments of a single supervising invocation.

## Requirements

### Requirement: /sai-review is a user-invoked routed composition command

The pipeline SHALL provide a user-invoked command `/sai-review` that is a routed composition command, not an `opsx:*` skill, run through both harness wrappers and the `meta-review` card name. The command SHALL run the existing review phase adapter at position 0 to completion, then conditionally dispatch the recommended audit phase adapters as chained segments of one supervising invocation. `/sai-review` SHALL NOT declare a managed worker, worker binding, or worker matrix entry of its own; every segment SHALL retain its existing worker.

#### Scenario: Both harnesses route the composition
- **WHEN** a user invokes `/sai-review {name}` on Claude Code or opencode
- **THEN** the harness wrapper SHALL fetch its boot adapter and the meta-review command-bootstrap, forward the `meta-review` envelope with `arguments_value: {name}`, and run the composition coordinator without re-entering any wrapper

### Requirement: Single change resolution with composition-minted envelopes

The composition SHALL resolve the target OpenSpec change name exactly once at invocation start using the standard change-consuming resolution order (trimmed non-empty `arguments_value`, then the zero/one/multiple picker). It SHALL mint each segment envelope as `{command_name: <phase>, arguments_value: {name}}`; segments SHALL NOT re-run the change-picker or the prerequisite checks.

#### Scenario: One resolved name across all segments
- **WHEN** the review segment and an activated audit segment run in one invocation
- **THEN** both SHALL receive the same resolved change name in their composition-minted envelopes and neither SHALL re-run resolution

### Requirement: Prerequisites run once at composition start

The composition SHALL run the three OpenSpec prerequisite checks (`openspec` binary in PATH, `openspec/` directory exists, `openspec/config.yaml` declares `schema: sai-workflow`) exactly once before any segment dispatch. Every segment SHALL inherit the satisfied prerequisites and never repeat them.

#### Scenario: Segments inherit satisfied prerequisites
- **WHEN** the review segment completes and an audit segment activates
- **THEN** the audit segment SHALL NOT repeat the prerequisite checks performed at composition start

### Requirement: No intermediate approval gate and review-first re-entry

A successful review segment SHALL transition immediately to the activated audit segments based on the triage parse, without stopping for artifact feedback, plan review, or user approval. Re-entry after interruption or partial audit execution SHALL go through the review segment again; the run SHALL never resume audit loops directly while skipping review regeneration. On-disk `review.md` triage sections SHALL remain the activation record.

#### Scenario: Failed review closes the invocation
- **WHEN** the review segment returns `failed` or `cancelled`
- **THEN** the composition SHALL close without activating any audit segment and SHALL report the failure or clean-stop summary and the accumulated changed-files union
