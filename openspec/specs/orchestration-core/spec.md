# orchestration-core Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.

## Requirements

### Requirement: Separate Plan and Build ownership

The explore route selector (`sai/commands/explore/steps/route-selector.md`) SHALL identify Plan - Unattended as the supervised sai-1/sai-2 route and Direct Build - Unattended as the direct implementation route. Explore SHALL retain no direct write scope, and each route SHALL retain its existing worker-owned boundaries.

#### Scenario: orchestration selects a route

- **WHEN** a route is explicitly selected
- **THEN** dispatch and mutation ownership follow the corresponding existing route contract.

### Requirement: Separate phase worker contracts
The command cards SHALL retain a separate design-worker contract (`sai/commands/design/worker.md`) that layers phase policy over the shared plan worker rules of `sai/commands/plan/worker-common.md`, and separate RED and GREEN worker contracts (`sai-3-red-worker`, `sai-3-green-worker`) for implementation behavior. The workers SHALL NOT be merged into a conditional all-phase prompt.

#### Scenario: Phase behavior remains isolated
- **WHEN** a design-only or implementation-only rule is authored
- **THEN** it SHALL reside in the corresponding phase worker contract
- **AND** it SHALL NOT alter the other phase's worker behavior

### Requirement: Stateless worker payload validation

The repository SHALL keep a deterministic, stateless tool at `sai/tools/worker-report-validator.js` that validates closed worker payload shapes. Input-file mode (with stdin as the legacy fallback) SHALL accept the payload with `--kind` (`terminal` or `progress`) and an optional `--command`, enumerate required fields and types, and return a timeless verdict containing `ok` and `errors` through exported pure `validateText`. The `validate` JSON response SHALL carry `received_at` in ISO-8601 with a numeric offset, never Z, as its first key. Exported `generateReceivedAt` SHALL remain the only clock for validate and `bin/sai-state.js`. The validator SHALL never repair, infer, or reformat payload values.

A coordinator that validates worker reports SHALL consume tool verdicts rather than re-derive validation. For a `step_machine` progress payload, the same validator module SHALL run inside `sai-state emit <id> <machineId> --progress -`, and its validation block SHALL replace a separate validate call. Post-ready reports of the workers that follow `sai/policies/worker-report-transport.md` (the `/sai-3-implement` RED and GREEN workers and the full Direct Build implementation, backfill, and archive workers) SHALL instead arrive as private path/hash references. The resolved validator SHALL verify the reference and validate the same single-read bytes, returning an accepted parsed payload only on success. Delivery failure, invalid report content, and a call with no response SHALL remain distinct; report acceptance SHALL not be inferred from completed repository effects or from a missing response.

#### Scenario: Validator accepts closed terminal payloads
- **WHEN** the coordinator receives a terminal payload (status: completed, needs_input, failed, or cancelled)
- **THEN** it invokes validate with kind terminal using the input file or, for a worker that follows the shared report transport, its reference, requires status, summary, and changed_files, and consumes the valid verdict or concrete validation errors

#### Scenario: validated_at uses a numeric offset without Z
- **WHEN** a CLI emits `received_at` on a JSON response
- **THEN** the value has format `YYYY-MM-DDTHH:MM:SS±HH:MM` with a numeric offset and never uses Z, including +00:00 on UTC

#### Scenario: Validator rejects malformed payloads without repair
- **WHEN** a payload carries a missing field, wrong field type, or invalid enum value
- **THEN** the validator returns errors without correction, and the coordinator does not process it as an accepted report

#### Scenario: Validator checks notice, progress, and conflict_detected kinds
- **WHEN** a progress payload is validated, or `validate` is called with the retired `--kind notice` or `--kind conflict_detected`
- **THEN** the validator checks the progress payload through the progress kind, using the same module inside the progress emit for a step_machine progress payload, and rejects a retired kind as a usage error

#### Scenario: Coordinator consumes verdict instead of prose validation
- **WHEN** a coordinator that validates worker reports receives a payload
- **THEN** it reads the tool verdict or progress emit validation block rather than duplicating shape, field-type, or timestamp checks in prose or consumer logic

#### Scenario: Full Direct Build consumes verified report references
- **WHEN** a full Direct Build worker returns a post-ready path/hash reference
- **THEN** the coordinator passes reference values to file-mode validation and consumes only its accepted parsed payload without copying or re-reading the report
