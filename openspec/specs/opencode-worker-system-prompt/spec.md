# opencode-worker-system-prompt Specification

## Purpose
TBD: Define explicit root-aware contract system prompts for managed opencode workers.

## Requirements

### Requirement: Managed opencode workers have explicit root-aware contract system prompts

Every projected opencode worker agent SHALL contain the literal prompt `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` in its markdown body, with `<worker-name>` replaced by the exact agent filename stem. The active opencode fetch resolver SHALL interpret that directive by checking the project-local `.opencode/sai/orchestration/workers/<worker-name>.md` path first and the user-global `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` path second. The worker SHALL receive this prompt before processing coordinator dispatch input, so contract delivery SHALL NOT depend on coordinator-authored prompt wording.

#### Scenario: Current managed workers load their own contracts

- **WHEN** the seven opencode worker agent files are projected
- **THEN** each file SHALL contain a body fetch using `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` for the matching `sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-implementation-worker.md`, `sai-5-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, or `sai-8-accessibility-worker.md` contract
- **AND** no agent file SHALL point to another worker's contract

#### Scenario: Project-local contract wins over the global contract

- **WHEN** both `.opencode/sai/orchestration/workers/<worker-name>.md` and `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` exist
- **THEN** the worker system prompt SHALL load the project-local contract
- **AND** the global contract SHALL be used only when the project-local candidate is absent

#### Scenario: An agent file without a resolvable contract is invalid

- **WHEN** a projected worker agent file omits its contract fetch, or the fetch resolver finds neither root's canonical contract
- **THEN** projection or activation validation SHALL fail with an actionable worker-specific error before opencode configuration is written

### Requirement: Installer consumers preserve the canonical contract fetch

The projected opencode agent files, installer guidance, doctor records, and fresh-configuration projection SHALL preserve each agent's canonical contract fetch alongside its model, mode, variant, and task permissions. No consumer SHALL synthesize a fetch from binding text or silently omit it.

#### Scenario: Fresh projection includes every contract fetch

- **WHEN** the opencode projection is installed to a fresh destination
- **THEN** every projected worker agent file SHALL contain its canonical contract fetch
- **AND** the file SHALL retain its worker-specific model, mode, variant policy, and task permissions

#### Scenario: Doctor and installer expose the same agent records

- **WHEN** installer guidance and doctor enumerate managed opencode workers
- **THEN** both SHALL observe the same worker agent files and the same canonical contract fetches

### Requirement: User-owned opencode agent files are never overwritten

Installing or re-installing the projected worker agent files SHALL follow the owned-copy lifecycle: a missing file is created with the canonical definition and its ownership sidecar; an exact-compatible existing file is reused; an incompatible existing file blocks installation with rename-or-remove remediation and SHALL NOT be overwritten or repaired. Guarded uninstall SHALL remove a projected agent file only when its ownership sidecar exists and its current hash matches the recorded managed hash; user-edited files SHALL be preserved. This requirement SHALL NOT weaken existing configuration-merge and idempotence behavior.

#### Scenario: Existing custom agent file blocks reinstall

- **WHEN** a projected opencode agent file already exists with user-customized content
- **THEN** installation SHALL NOT overwrite or repair it, and SHALL block with the incompatible-collision remediation when the content differs from the canonical definition

#### Scenario: Missing worker receives the canonical definition

- **WHEN** a projected opencode agent file is absent
- **THEN** installation SHALL create the file with the canonical frontmatter (mode, model, variant, permissions) and contract-fetch body, plus its ownership sidecar

#### Scenario: User-edited managed agent survives uninstall

- **WHEN** uninstall finds an ownership sidecar but the current agent-file hash no longer matches the recorded managed hash
- **THEN** uninstall SHALL preserve the edited agent file
