# halt-message-fidelity Specification

## Purpose

Keep the OpenSpec prerequisite remediation literals verbatim from `sai/policies/prereqs-check.md` to the user when `sai-explore` halts, with no file written.

## Requirements

### Requirement: Verbatim halt messages

When the inline prerequisite check fails, `sai-explore` SHALL halt and present to the user the exact literal remediation text defined in `sai/policies/prereqs-check.md`, unchanged and in full — never a summarized, rephrased, or worker-failure-shaped message. The three exact literals are:

    openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec — To verify by hand, run: `openspec --version`
    OpenSpec not initialized in this project. Run: openspec init
    openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.

#### Scenario: missing binary halts with the binary literal

- **WHEN** the `openspec` binary is not available on PATH
- **THEN** `sai-explore` halts and prints exactly `` openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec — To verify by hand, run: `openspec --version` ``
- **AND** no prefix, suffix, summary, or rephrasing is added around the literal

#### Scenario: missing directory halts with the directory literal

- **WHEN** the `openspec/` directory does not exist at the project root
- **THEN** `sai-explore` halts and prints exactly `OpenSpec not initialized in this project. Run: openspec init`

#### Scenario: missing schema halts with the schema literal

- **WHEN** `openspec/config.yaml` does not declare `schema: sai-workflow`
- **THEN** `sai-explore` halts and prints exactly:

      openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.
- **AND** no prefix, suffix, summary, or rephrasing is added around the literal

### Requirement: No write on halt

A halted `sai-explore` SHALL NOT create or modify any file.

#### Scenario: failed check leaves the project untouched

- **WHEN** any prerequisite check fails and `sai-explore` halts
- **THEN** no file is created or modified by `sai-explore`
