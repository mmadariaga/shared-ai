## ADDED Requirements

### Requirement: The probe MUST modify exactly one Copilot prompt file

`commands/copilot/sai-explore.prompt.md` is the only file whose frontmatter is changed by this probe. The change is additive: a `tools:` field is appended to the existing YAML frontmatter; the existing `description`, `argument-hint`, `agent`, and `model` fields are preserved verbatim and in their original order. The other 13 Copilot prompt files (`sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-pr`, and `budget`) are NOT modified by this probe.

#### Scenario: Frontmatter is additive only

- **WHEN** the probe's modified `commands/copilot/sai-explore.prompt.md` is read
- **THEN** the YAML frontmatter contains the original four fields (`description`, `argument-hint`, `agent`, `model`) in their original order, plus one new `tools:` field; no existing field is removed, renamed, reordered, or had its value changed

#### Scenario: Other 13 prompt files are byte-identical to pre-probe state

- **WHEN** any other file under `commands/copilot/*.prompt.md` is read
- **THEN** its frontmatter is byte-identical to its pre-probe state — the probe touches only `sai-explore.prompt.md`

### Requirement: The probe's `tools:` field MUST list only `vscode/askQuestions`

The probe's `tools:` field lists exactly one tool: `vscode/askQuestions`. No other tool is added in this probe. The narrow scope is deliberate: a single-tool `tools:` field makes the run discriminate augment-vs-replace semantics by observation. If file reads and the terminal still work, augment semantics are in play; if either degrades silently, replace semantics are in play.

#### Scenario: Single-tool `tools:` field

- **WHEN** the probe's modified `commands/copilot/sai-explore.prompt.md` frontmatter is parsed
- **THEN** the `tools:` field is a YAML list whose sole element is the string `vscode/askQuestions`

### Requirement: The probe MUST observe three specific signals during the `/sai-explore` run

The probe's verification step runs `/sai-explore` in VS Code Copilot and observes three signals:

  1. **Picker signal** — a native option-picker appears in the VS Code Copilot chat UI without the user typing `#askUser`; the model invokes the picker autonomously.
  2. **File-read signal** — a `Fetch @<path>` instruction resolves and reads the target file successfully (the fetch skill still functions).
  3. **Terminal signal** — `openspec list --json` runs and returns valid JSON (the terminal tool still functions).

A silent degradation of any one of the three signals is the failure mode to watch.

#### Scenario: All three signals observed during a successful probe

- **WHEN** `/sai-explore` is run in VS Code Copilot with the modified `sai-explore.prompt.md` in place
- **THEN** the picker appears without `#askUser`, the fetch skill reads the target file, and `openspec list --json` returns valid JSON — confirming the picker is available, the file-read and terminal tools are not silently degraded, and the model's autonomous invocation works

#### Scenario: File-read or terminal signal is silently degraded

- **WHEN** `/sai-explore` is run in VS Code Copilot with the modified `sai-explore.prompt.md` in place
- **THEN** if the fetch skill fails to read a file, or `openspec list --json` does not return valid JSON, the agent SHALL report the specific signal that degraded so the failure mode (replace vs augment) can be identified

### Requirement: The probe MUST classify the picker-invocation modality orthogonally to the replace-vs-augment classification

The probe outcome records the picker-invocation modality as one of three values, classified independently of the replace-vs-augment classification:

  - **autonomous** — the model invokes the picker without the user typing `#askUser`; the picker appears in response to the model's own reasoning.
  - **user-triggered-only** — the picker appears only when the user explicitly types `#askUser`; the model never invokes it on its own.
  - **absent** — the picker never appears, even with `#askUser`; the tool is not available or does not function in the probe's runtime.

The picker-invocation modality is orthogonal to the replace-vs-augment classification. A run can land in any combination of {autonomous, user-triggered-only, absent} × {augment, replace}. The probe outcome records BOTH axes.

A picker modality of `user-triggered-only` or `absent` is recorded as a fatal outcome for the wired feature, regardless of the augment-vs-replace result — the feature requires autonomous invocation to be useful. Without autonomous invocation, the model cannot call the picker on its own, and the `closed-choice-prompts` policy cannot be wired through the picker.

#### Scenario: Picker is autonomous and semantics are augment (feature wireable)

- **WHEN** `/sai-explore` is run in VS Code Copilot and the picker appears without `#askUser`, the fetch skill reads the target file, and `openspec list --json` returns valid JSON
- **THEN** the outcome is recorded as `picker=autonomous, semantics=augment` — the probe confirms the feature is wireable

#### Scenario: Picker is user-triggered-only and semantics are augment (fatal for the feature)

- **WHEN** `/sai-explore` is run in VS Code Copilot and reads + terminal work, but the model never invokes the picker without `#askUser`
- **THEN** the outcome is recorded as `picker=user-triggered-only, semantics=augment` — a FATAL outcome for the feature: the model cannot call the picker on its own, regardless of `tools:` wiring, and the `closed-choice-prompts` policy cannot be wired through the picker

#### Scenario: Picker is absent (any semantics)

- **WHEN** `/sai-explore` is run in VS Code Copilot and the picker never appears, even after the user types `#askUser`
- **THEN** the outcome is recorded as `picker=absent` paired with the replace-vs-augment result — the `vscode/askQuestions` tool is not available or does not function in this runtime

### Requirement: The probe MUST classify replace vs augment semantics

The probe's outcome classifies the `tools:` field's semantics into one of two cases:

  - **Augment** — the file-read and terminal signals succeed. The `tools:` field is additive to the default toolset.
  - **Replace** — the file-read or terminal signal degrades. The `tools:` field replaces the default toolset, and the only available tool is `vscode/askQuestions`.

The replace-vs-augment classification is derived from the file-read and terminal signals only — never from the picker-invocation modality (which is recorded separately by the preceding requirement).

#### Scenario: Augment semantics confirmed

- **WHEN** the probe's three-signal observation shows the file-read and terminal signals both succeeding (regardless of picker modality)
- **THEN** the `tools:` field semantics are recorded as `augment`; the probe outcome states that the model retains the default file-read and terminal tools alongside the new `vscode/askQuestions` tool

#### Scenario: Replace semantics confirmed

- **WHEN** the probe's three-signal observation shows the file-read or terminal signal degrading (regardless of picker modality)
- **THEN** the `tools:` field semantics are recorded as `replace`; the probe outcome states that any future `tools:` field MUST include the file-read and terminal tool identifiers explicitly

### Requirement: The probe MUST identify the terminal tool identifier under replace semantics

If the probe's outcome is `replace`, the terminal tool identifier for the VS Code prompt-file surface MUST be identified empirically. The hypothesis to test is that the terminal tool is the flat `terminal` (not the CLI's `execute/runInTerminal`), because the CLI vocabulary would be wiped by replace semantics.

#### Scenario: Terminal tool is `terminal` under replace semantics

- **WHEN** the probe's outcome is `replace` and the model successfully invokes a terminal command
- **THEN** the tool identifier used by the model is recorded as `terminal` (not `execute/runInTerminal`)

#### Scenario: Terminal tool is unknown under augment semantics

- **WHEN** the probe's outcome is `augment` (the default terminal tool continues to work, so the replace-semantics identifier is not exercised)
- **THEN** the terminal tool identifier under replace semantics is NOT resolved by this probe; the requirement is left for a future replace-semantics probe
