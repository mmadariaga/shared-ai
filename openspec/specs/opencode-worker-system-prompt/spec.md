# opencode-worker-system-prompt Specification

## Purpose
Define the literal root-aware contract fetch that every projected opencode worker agent file SHALL carry in its body — `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` — resolved project-local before user-global and preserved across projection, install, and doctor validation.

## Requirements

### Requirement: Managed opencode workers have explicit root-aware contract system prompts

Every projected opencode worker agent SHALL contain the literal prompt `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` in its markdown body, with `<worker-name>` replaced by the exact agent filename stem. The active opencode fetch resolver SHALL interpret that directive by checking the project-local `.opencode/sai/orchestration/workers/<worker-name>.md` path first and the user-global `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` path second. The worker SHALL receive this prompt before processing coordinator dispatch input, so contract delivery SHALL NOT depend on coordinator-authored prompt wording.

#### Scenario: Current managed workers load their own contracts

- **WHEN** the projected opencode worker agent files are enumerated, including `sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-red-worker.md`, `sai-3-green-worker.md`, `sai-4-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, and `sai-8-accessibility-worker.md`
- **THEN** each file SHALL contain a body fetch using `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` for its own agent filename stem
- **AND** no agent file SHALL point to another worker's contract

#### Scenario: Project-local contract wins over the global contract

- **WHEN** both `.opencode/sai/orchestration/workers/<worker-name>.md` and `~/.config/opencode/sai/orchestration/workers/<worker-name>.md` exist
- **THEN** the worker system prompt SHALL load the project-local contract
- **AND** the global contract SHALL be used only when the project-local candidate is absent

#### Scenario: An agent file without a resolvable contract is invalid

- **WHEN** a projected worker agent file omits its contract fetch, or the fetch resolver finds neither root's canonical contract
- **THEN** projection or activation validation SHALL fail with an actionable worker-specific error before opencode configuration is written

### Requirement: Installer consumers preserve the canonical contract fetch

The bundled sources under `agents/opencode/`, the projected worker agent files they seed, and the installer guidance SHALL preserve each agent's canonical contract fetch in the file body alongside the frontmatter's model, mode, variant, and task permissions. Doctor SHALL validate each projected file's body and non-tunable frontmatter through the customization marker against its bundled source while ignoring tuning and the suffix, so a managed contract fetch that diverges from the bundled source is reported as an incompatible file rather than silently tolerated. No consumer SHALL synthesize a fetch from binding text or silently omit it.

#### Scenario: Fresh projection includes every contract fetch
- **WHEN** the opencode projection is installed to a fresh destination
- **THEN** every projected worker agent file SHALL contain its canonical contract fetch; the file SHALL retain its worker-specific model, mode, variant policy, and task permissions

#### Scenario: Doctor and installer observe the same projected files
- **WHEN** installer guidance and doctor enumerate managed opencode workers
- **THEN** both SHALL observe the same manifest-projected worker agent files and the same bundled sources; the canonical contract fetch SHALL be preserved as file-body content validated by doctor's body comparison, not as a doctor record field or a configuration projection

### Requirement: User-owned opencode agent files preserve user tunables

Projected workers SHALL follow tunable-seed: missing files receive compiled source and shipped tuning; incompatible managed content is replaced while preserving destination model, optional variant, and the exact suffix after the standalone customization marker. Tuning SHALL use the existing top-level structural anchor. Compatibility SHALL ignore tuning and the explicit suffix; compatible definitions SHALL be reused untouched without a notice. Managed divergence SHALL produce a path-specific notice without blocking installation. Legacy unmarked definitions SHALL retain only tuning; no ownership sidecar SHALL be written. Guarded uninstall SHALL ignore tuning but retain custom suffixes and other body or non-tunable-frontmatter differences. Configuration merge ownership and idempotence SHALL remain unchanged.

#### Scenario: Existing custom agent file is overwritten with notice
- **WHEN** a projected worker has changed managed instructions or non-tunable frontmatter
- **THEN** installation refreshes managed content, preserves native tuning and any exact delimited suffix, emits a path-specific notice, and continues without throwing

#### Scenario: Tuned existing agent file preserves its tunables
- **WHEN** a worker matches managed content but has different model or variant
- **THEN** installation reuses the definition untouched, preserving tuning and suffix without an overwrite notice

#### Scenario: Missing worker receives the canonical definition
- **WHEN** a projected opencode agent file is absent
- **THEN** installation SHALL create the file with the canonical frontmatter (mode, model, variant, permissions) and contract-fetch body; SHALL NOT create a `.<basename>.owner.json` file

#### Scenario: User-edited managed agent survives uninstall
- **WHEN** uninstall evaluates a destination whose body or non-tunable frontmatter differs from the source
- **THEN** uninstall SHALL preserve the edited agent file and emit the existing `Kept (project-local override)` warning

#### Scenario: Tuned managed agent is removed by uninstall
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source but whose tunable lines differ
- **THEN** uninstall SHALL remove the agent file; SHALL NOT consult any sidecar file

#### Scenario: User suffix survives guarded uninstall
- **WHEN** a current projected worker has extra user suffix instructions
- **THEN** guarded uninstall retains its definition
