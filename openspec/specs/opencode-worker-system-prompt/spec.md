# opencode-worker-system-prompt Specification

## Purpose
TBD: Define explicit root-aware contract system prompts for managed opencode workers.

## Requirements

### Requirement: Managed opencode workers have explicit root-aware contract system prompts

Every managed opencode registration default SHALL contain the literal prompt `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.`, with `<worker-name>` replaced by the exact registration key. The active opencode fetch resolver SHALL interpret that directive by checking the project-local `.opencode/sai/orchestration/workers/<worker-name>.md` path first and the user-global `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` path second. The worker SHALL receive this prompt before processing coordinator dispatch input, so contract delivery SHALL NOT depend on coordinator-authored prompt wording.

#### Scenario: Current managed workers load their own contracts

- **WHEN** the seven current managed opencode registrations are derived
- **THEN** each registration SHALL contain a `prompt` field using `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` for the matching `sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-implementation-worker.md`, `sai-5-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, or `sai-8-accessibility-worker.md` contract
- **AND** no registration SHALL point to another worker's contract

#### Scenario: Project-local contract wins over the global contract

- **WHEN** both `.opencode/sai/orchestration/workers/<worker-name>.md` and `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` exist
- **THEN** the worker system prompt SHALL load the project-local contract
- **AND** the global contract SHALL be used only when the project-local candidate is absent

#### Scenario: A registration without a resolvable contract prompt is invalid

- **WHEN** a managed worker's explicit registration defaults omit its `prompt`, or the fetch resolver finds neither root's canonical contract
- **THEN** census derivation or registration validation SHALL fail with an actionable worker-specific error before opencode configuration is written

### Requirement: Installer consumers preserve explicit contract prompts

The derived opencode managed-agent view, installer guidance, doctor records, and fresh configuration projection SHALL preserve each explicit registration `prompt` alongside its model, mode, variant, and task permissions. No consumer SHALL synthesize a prompt from binding text or silently omit it.

#### Scenario: Fresh configuration includes every prompt

- **WHEN** the opencode configuration is projected to a fresh destination
- **THEN** every current managed worker entry SHALL contain its explicit contract `prompt`
- **AND** the resulting registration SHALL retain its existing worker-specific model, mode, variant policy, and task permissions

#### Scenario: Doctor and installer expose the same prompt-bearing records

- **WHEN** installer guidance and doctor enumerate managed opencode workers
- **THEN** both SHALL observe the same worker keys and the same explicit contract prompt values as the derived census

### Requirement: User-owned opencode prompt customizations remain preserved

Installing or re-installing the repository defaults SHALL preserve an existing user's non-empty `prompt` value and unrelated agent fields for a same-named opencode worker. When the worker entry exists but has no `prompt`, installation SHALL inject the canonical fetch prompt while preserving all unrelated fields. A missing managed worker SHALL receive the canonical default prompt. This requirement SHALL NOT weaken existing configuration-merge and idempotence behavior.

#### Scenario: Existing custom prompt is preserved

- **WHEN** an opencode configuration already contains a managed worker with a custom `prompt`
- **THEN** installation SHALL leave that prompt and the worker's unrelated fields unchanged

#### Scenario: Missing worker receives the canonical prompt

- **WHEN** an opencode configuration lacks a current managed worker entry
- **THEN** installation SHALL add the worker with the repository default registration, including its canonical contract `prompt`

#### Scenario: Existing worker without a prompt is upgraded

- **WHEN** an opencode configuration contains a current managed worker entry without a `prompt` field
- **THEN** installation SHALL add that worker's canonical fetch prompt
- **AND** installation SHALL preserve the entry's existing model, mode, variant, permissions, and unrelated fields
