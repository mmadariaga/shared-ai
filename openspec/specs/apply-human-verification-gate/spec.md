# apply-human-verification-gate Specification

## Purpose
TBD - created by archiving change enhanced-apply-steps. Update Purpose after archive.

## Requirements

### Requirement: Agent SHALL present Human Verification checklist to user before marking items complete
`/sai-4-apply` SHALL NOT present a per-Step Human Verification checklist and SHALL NOT wait for user confirmation before proceeding to the commit proposal. The per-Step human verification gate no longer exists: apply's terminal functional review empirically re-exercises exactly the checks this gate used to guard, so a per-Step human stop on agent-verifiable checks no longer earns its cost — it blocked every Step, including unattended runs, on work an agent can now perform itself. ADR 0186 (`docs/adr/0186-gate-order-without-per-step-human-gate.md`) supersedes ADR 0019 on this point and fixes the post-report gate order without a per-Step human gate.

The replacement behavior lives elsewhere in this change and is not restated here: the marking and verdict rules are specified in the `terminal-review` delta (`Terminal functional review marks the Functional checkboxes it verified`, plus the execution, coverage, and per-check verdict requirements), and the remaining coordinator-owned gates are specified in the `apply-coordinator-ownership` delta (`coordinator-owns-human-gates`, now the commit authorization gates and the GREEN-conflict escalation only). A check the terminal functional review cannot verify SHALL stay `- [ ]` and be reported as pending human review rather than gated per Step.

#### Scenario: Step has Human Verification checks
- **WHEN** the agent reaches a Step whose Functional section contains one or more `- [ ]` checkboxes and the Step's Automated checks pass
- **THEN** no checklist is presented and no confirmation is awaited — the agent marks only the Step's Automated checkboxes and proceeds to the commit proposal, leaving those Functional checks for the terminal functional review later in the run

#### Scenario: User confirms Human Verification
- **WHEN** the user states during a Step that they have reviewed its Functional checks
- **THEN** that statement gates nothing and marks nothing, because no gate exists — only the terminal functional review marks a Functional checkbox, and only for a check whose verdict is `pass`

#### Scenario: Step has no Human Verification checks
- **WHEN** a Step contains only Automated checks
- **THEN** the agent marks that Step's Automated checkboxes after its verification passes and proceeds directly to the commit proposal, exactly as it does for a Step that has Functional checks

#### Scenario: Human section has zero checkboxes
- **WHEN** a Step's Functional section contains no `- [ ]` checkbox — for example, it holds only an italic explanatory note such as `*(No Functional checks — service-side step with no observable browser behavior.)*`
- **THEN** the Step contributes nothing to the terminal functional review's coverage, the agent pauses for no confirmation, and it proceeds directly to the commit proposal after the Automated checks pass
