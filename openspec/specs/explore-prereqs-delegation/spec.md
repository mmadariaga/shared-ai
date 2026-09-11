# explore-prereqs-delegation Specification

## Purpose

TBD — purpose to be documented.
## Requirements
### Requirement: Verdict-only surface in the main conversation
The main session SHALL relay the tool verdict directly with no completion-report envelope: exit 0 (`verdict: pass`) continues exploration, exit 1 (`verdict: halt`) prints the matching remediation literal from `sai/policies/prereqs-check.md` for the tool's `failed_check` unchanged with no prefix, suffix, summary, or rephrasing and stops without writing any file, and exit 2, unlocatable tool, or unparseable payload is reported as-is with no remediation literal and the run does not continue as passed, never as `verdict: pass` and never as a halt with an invented literal.

#### Scenario: direct verdict relay without envelope
- **WHEN** the inline preflight completes with any exit outcome
- **THEN** the main session relays that outcome directly with no envelope status mapping

#### Scenario: passing check surfaces a pass verdict only
- **WHEN** all three checks pass
- **THEN** the main session shows the pass verdict directly with no envelope and no openspec command transcript or check artifact content is relayed

#### Scenario: failing check surfaces a halt verdict only
- **WHEN** any of the three checks fails
- **THEN** the main session shows the halt verdict and the verbatim remediation literal directly with no envelope and the raw shell evidence that produced the halt is not relayed

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

### Requirement: Inline prerequisite check in the shared explore body
The `## Prerequisite checks` section of `sai/commands/explore/body.md` SHALL run the OpenSpec prerequisite preflight inline in the main session with no subagent and no deferral condition on every invocation, including sessions that never touch `openspec/`. It SHALL use the first existing tool-location candidate in `sai/policies/prereqs-check.md` order, project-local relative path first then verbatim global, and SHALL NOT compose a tool path by joining a root string to a suffix. The invocation SHALL be the byte-identical-per-harness literal `node <tool-path> check --json --cwd <project-root> --require-openspec-skills <harness>`; omitting the flag or passing any other value is a usage error (exit 2), never a halt. It SHALL NOT re-derive, second-guess, or repair a check in prose and SHALL NOT self-correct a non-zero tool failure.

#### Scenario: inline check runs in the main agent, not a subagent
- **WHEN** `sai/commands/explore/body.md` prerequisite checks run after the change
- **THEN** the main session runs one direct tool invocation with no subagent dispatch

#### Scenario: both harness projections inherit the inline run
- **WHEN** the shared body `sai/commands/explore/body.md` is read
- **THEN** its `## Prerequisite checks` section contains the inline directive with no per-harness copy of the check execution

#### Scenario: exactly one unconditional inline run per invocation
- **WHEN** `sai/commands/explore/body.md` is read after the change
- **THEN** its `## Prerequisite checks` section runs exactly one inline check on every invocation with no deferral condition

