# explore-prereqs-delegation Specification

## Purpose

TBD — purpose to be documented.

## Requirements

### Requirement: Delegated prerequisite check in the shared explore body

The `## Prerequisite checks` section of `sai/commands/explore/body.md` SHALL delegate the execution of the three OpenSpec prerequisite checks — the `openspec` binary availability check, the `openspec/` directory existence check, and the `openspec/config.yaml` `schema: sai-workflow` check, as defined in `sai/policies/prereqs-check.md` — to exactly one budget subagent per invocation, instead of running them inline in the main agent. The delegation SHALL live in the shared body file so that both the Claude Code and opencode harness projections inherit it. The subagent SHALL be spawned under the budget-subagent binding (`skills/claude/budget-subagent/SKILL.md` on Claude Code, `skills/opencode/budget-subagent/SKILL.md` on opencode), and the main agent is a permitted dispatcher per the dispatch-safety invariant.

The `commands/claude/sai-explore.md` wrapper's tool list SHALL NOT be altered by this change.

#### Scenario: the check runs in a budget subagent, not the main agent

- **WHEN** `sai/commands/explore/body.md` is read after the change
- **THEN** its `## Prerequisite checks` section contains a delegation directive that spawns the budget subagent
- **AND** the section contains no inline instruction to run `openspec --version`, probe for the `openspec/` directory, or inspect `openspec/config.yaml` for the schema line

#### Scenario: both harness projections inherit the delegation

- **WHEN** the shared body `sai/commands/explore/body.md` is read
- **THEN** its `## Prerequisite checks` section contains the delegation directive
- **AND** no per-harness copy of the check execution exists in either wrapper

#### Scenario: exactly one unconditional spawn per invocation

- **WHEN** `sai/commands/explore/body.md` is read after the change
- **THEN** its `## Prerequisite checks` section spawns exactly one budget subagent on every invocation
- **AND** the section contains no condition deferring the check to first use of an openspec path

### Requirement: Verdict-only surface in the main conversation

The budget subagent SHALL return only a verdict — `pass` or `halt` — to the main agent, carried in the completion report's `output` field as the payload `verdict: pass` or `verdict: halt`; the report's envelope `status` SHALL remain within the budget-subagent binding's closed vocabulary (`success | partial | failed`). The subagent SHALL NOT return the path table, raw shell output, or any openspec command transcript. The check artifact content SHALL likewise not cross the boundary, with one explicit exemption: on `halt`, the subagent SHALL include the verbatim remediation literal from `sai/policies/prereqs-check.md` for the failed check in the output payload, as required by the halt-message-fidelity capability. The main conversation SHALL show the verdict; evidence (the shell output that produced it) SHALL stay in the subprocess. A completion report whose envelope status is `failed` or `partial` is a dispatch failure, not a verdict, and SHALL NOT be presented as a pass or halt verdict (per the halt-message-fidelity capability).

#### Scenario: passing check surfaces a pass verdict only

- **WHEN** all three checks pass
- **THEN** the main conversation shows the pass verdict
- **AND** no openspec command transcript or check artifact content is relayed into the main conversation

#### Scenario: failing check surfaces a halt verdict only

- **WHEN** any of the three checks fails
- **THEN** the main conversation shows the halt verdict and the verbatim remediation text per the halt-message-fidelity capability
- **AND** the raw shell evidence that produced the halt is not relayed into the main conversation

### Requirement: Path reference retained in the main agent

The main agent SHALL fetch `@sai/policies/prereqs-paths.md` locally and retain the OpenSpec path table in the main conversation. The path reference — the change-artifact path table (the `openspec/specs/{name}/spec.md`, `openspec/schemas/sai-workflow/schema.yaml`, `openspec/changes/{change-name}/**`, and `openspec/changes/archive/YYYY-MM-DD-{change-name}/` entries) — SHALL NOT cross the subagent boundary: the budget subagent SHALL NOT receive the path table and SHALL NOT be asked to resolve or return artifact paths. The two paths the prerequisite checks themselves operate on — `openspec/` and `openspec/config.yaml` — are part of the check task, not of the path reference, and SHALL remain available to the delegated check.

#### Scenario: main agent holds the path table

- **WHEN** `sai-explore` completes its `## Prerequisite checks` section
- **THEN** the main agent has the path table from `sai/policies/prereqs-paths.md` available for local artifact reads
- **AND** the subagent's output contract contains no path table entries

#### Scenario: subagent never receives the change-artifact path reference

- **WHEN** the budget subagent is spawned for the prerequisite check
- **THEN** its prompt contains only the check execution task and the verdict output contract
- **AND** the prompt does not include `@sai/policies/prereqs-paths.md` or any change-artifact path (`openspec/specs/{name}/spec.md`, `openspec/schemas/sai-workflow/schema.yaml`, `openspec/changes/{change-name}/**`, or the archive pattern)
- **AND** the prompt may carry the check's own operating paths `openspec/` and `openspec/config.yaml` as part of the check task

### Requirement: Review-loop artifact reads stay in the main agent

The delegation SHALL NOT move the post-crystallization review-loop's artifact reads to a subagent. The review-loop SHALL continue reading `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, and `interfaces.md` in the main agent exactly as before this change.

#### Scenario: review-loop reads remain main-agent-side

- **WHEN** the user triggers the `review-loop` token or the semantic review invitation after this change
- **THEN** the review-loop reads the requested artifacts in the main agent
- **AND** no budget subagent is spawned for review-loop artifact reads
