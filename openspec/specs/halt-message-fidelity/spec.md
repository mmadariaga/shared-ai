# halt-message-fidelity Specification

## Purpose

TBD — purpose to be documented.

## Requirements

### Requirement: Verbatim halt messages across the delegation boundary

When the delegated prerequisite check fails, `sai-explore` SHALL halt and present to the user the exact literal remediation text defined in `sai/policies/prereqs-check.md`, unchanged and in full — never a summarized, rephrased, or worker-failure-shaped message. The three exact literals are:

    openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec
    OpenSpec not initialized in this project. Run: openspec init
    openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.

#### Scenario: missing binary halts with the binary literal

- **WHEN** the `openspec` binary is not available on PATH
- **THEN** `sai-explore` halts and prints exactly `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec`
- **AND** no prefix, suffix, summary, or rephrasing is added around the literal

#### Scenario: missing directory halts with the directory literal

- **WHEN** the `openspec/` directory does not exist at the project root
- **THEN** `sai-explore` halts and prints exactly `OpenSpec not initialized in this project. Run: openspec init`

#### Scenario: missing schema halts with the schema literal

- **WHEN** `openspec/config.yaml` does not declare `schema: sai-workflow`
- **THEN** `sai-explore` halts and prints exactly:

      openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.
- **AND** no prefix, suffix, summary, or rephrasing is added around the literal

### Requirement: The verdict output contract carries the verbatim remediation text

The budget subagent's structured completion report SHALL carry the check verdict in its `output` field — the payload `verdict: pass` or `verdict: halt` — with the verbatim remediation text from `sai/policies/prereqs-check.md` included on halt, and the main agent SHALL relay that text to the user unchanged. The report's envelope `status` SHALL remain within the budget-subagent binding's closed vocabulary (`success | partial | failed`); the verdict is carried in the output field, never in the envelope status. The subagent SHALL NOT substitute a generic failure summary for the remediation literal.

#### Scenario: halt verdict includes the literal

- **WHEN** the budget subagent detects a failed prerequisite check and its run completes
- **THEN** its completion report carries envelope `status: success` and an `output` payload of `verdict: halt` together with the exact remediation literal for the failed check
- **AND** the report does not replace the literal with a failure-cause summary

#### Scenario: main agent relays the literal verbatim

- **WHEN** the main agent receives a halt verdict from the budget subagent
- **THEN** it prints the report's remediation literal to the user exactly as received
- **AND** it does not rephrase, truncate, or wrap the literal in worker-failure framing

### Requirement: Dispatch failure is not a halt verdict

When the budget subagent's completion report carries envelope `status: failed` or `status: partial` (for example, a permission block or tool-call-cap exhaustion per the budget-subagent binding rules), no check verdict was produced. `sai-explore` SHALL present that as a dispatch failure — the prerequisite check could not be completed — and SHALL NOT present it as a halt verdict, SHALL NOT print any remediation literal, and SHALL NOT continue as if the checks passed.

#### Scenario: failed or partial envelope surfaces a dispatch failure, not a halt verdict

- **WHEN** the budget subagent's completion report carries envelope `status: failed` or `status: partial`
- **THEN** `sai-explore` presents the dispatch failure without a pass or halt verdict
- **AND** no remediation literal is printed and the run does not continue as if the checks passed

### Requirement: No-write-on-failure survives delegation

A halted `sai-explore` SHALL NOT create or modify any file, exactly as the pre-change inline check required. Delegating the check to a subagent SHALL NOT change the halt's write behavior.

#### Scenario: failed check leaves the project untouched

- **WHEN** any prerequisite check fails and `sai-explore` halts
- **THEN** no file is created or modified by `sai-explore` or the delegated subagent
