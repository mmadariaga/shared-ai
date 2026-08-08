# opencode-worker-system-prompt Specification

## Purpose
Define the literal root-aware contract fetch that every projected opencode worker agent file SHALL carry in its body — `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` — resolved project-local before user-global and preserved across projection, install, and doctor validation.

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

The bundled sources under `agents/opencode/`, the projected worker agent files they seed, and the installer guidance SHALL preserve each agent's canonical contract fetch in the file body alongside the frontmatter's model, mode, variant, and task permissions. Doctor SHALL validate each projected file's body and non-tunable frontmatter against its bundled source, so a contract fetch that diverges from the bundled source is reported as an incompatible file rather than silently tolerated. No consumer SHALL synthesize a fetch from binding text or silently omit it.

#### Scenario: Fresh projection includes every contract fetch

- **WHEN** the opencode projection is installed to a fresh destination
- **THEN** every projected worker agent file SHALL contain its canonical contract fetch
- **AND** the file SHALL retain its worker-specific model, mode, variant policy, and task permissions

#### Scenario: Doctor and installer observe the same projected files

- **WHEN** installer guidance and doctor enumerate managed opencode workers
- **THEN** both SHALL observe the same manifest-projected worker agent files and the same bundled sources
- **AND** the canonical contract fetch SHALL be preserved as file-body content validated by doctor's body comparison, not as a doctor record field or a configuration projection

### Requirement: User-owned opencode agent files preserve user tunables
Installing or re-installing the projected worker agent files SHALL follow the `tunable-seed` lifecycle: a missing file is created with the canonical definition (the shipped tunables are seeded); an existing file is updated by overwriting its body and non-tunable frontmatter with the source bytes while preserving the destination's tunable values (`model`, `variant`) placed per the structural anchor in `agent-tunable-ownership`; a body-or-non-tunable-frontmatter divergence triggers a console notice naming the destination path, and the installer continues. The installer SHALL NOT write a `.<basename>.owner.json` sidecar file. Guarded uninstall SHALL remove a projected agent file only when its body and non-tunable frontmatter match the source; a destination whose body or non-tunable frontmatter differs from source is a project-local override and SHALL be preserved. A destination whose tunable lines differ from the source but whose body and non-tunable frontmatter match SHALL be deleted by uninstall. This requirement SHALL NOT weaken existing configuration-merge and idempotence behavior.

#### Scenario: Existing custom agent file is overwritten with notice
- **WHEN** a projected opencode agent file already exists with user-customized body or non-tunable frontmatter content
- **THEN** installation SHALL overwrite the body and non-tunable frontmatter with the source bytes
- **AND** SHALL preserve the destination's tunable values placed per the structural anchor in `agent-tunable-ownership`
- **AND** SHALL emit a console notice naming the destination path
- **AND** SHALL NOT throw and SHALL NOT block installation

#### Scenario: Tuned existing agent file preserves its tunables
- **WHEN** a projected opencode agent file already exists with body and non-tunable frontmatter that match the source, but with tunable lines (`model`, `variant`) that differ from the source
- **THEN** installation SHALL overwrite the body and non-tunable frontmatter with the source bytes while preserving the destination's tunable lines
- **AND** SHALL NOT emit a console notice for that destination

#### Scenario: Missing worker receives the canonical definition
- **WHEN** a projected opencode agent file is absent
- **THEN** installation SHALL create the file with the canonical frontmatter (mode, model, variant, permissions) and contract-fetch body
- **AND** SHALL NOT create a `.<basename>.owner.json` file

#### Scenario: User-edited managed agent survives uninstall
- **WHEN** uninstall evaluates a destination whose body or non-tunable frontmatter differs from the source
- **THEN** uninstall SHALL preserve the edited agent file and emit the existing `Kept (project-local override)` warning

#### Scenario: Tuned managed agent is removed by uninstall
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source but whose tunable lines differ
- **THEN** uninstall SHALL remove the agent file
- **AND** SHALL NOT consult any sidecar file
