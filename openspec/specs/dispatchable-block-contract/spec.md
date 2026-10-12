# dispatchable-block-contract Specification

## Purpose
Define one Ready to Propose block contract that every implementation route accepts, so that choosing a route never fails on block shape.

## Requirements

### Requirement: One dispatchable contract serves every implementation route

`sai/policies/ready-to-propose-format.md` SHALL define a Dispatchable contract section stating that a block is dispatchable when it passes the `dispatchable` profile of `sai/tools/ready-to-propose.js` and every line the profile's lexical pre-filter flags carries a `context` verdict from the bounded judgment of `sai/policies/block-hygiene-judgment.md`. The same contract SHALL apply to Plan - Unattended, Direct Build - Unattended, and Manual; no route SHALL define a block profile of its own. The policy's format validator comment SHALL name the `dispatchable` profile.

#### Scenario: A dispatchable block suits every route

- **WHEN** a block set passes the `dispatchable` profile and every flagged line carries a `context` verdict
- **THEN** the set is valid for Plan - Unattended, Direct Build - Unattended, and Manual alike

### Requirement: Every block carries at least one in-scope implementation item

The `**Implementation Details**` field of every Ready to Propose block, and of every slice in a sliced set, SHALL carry at least one in-scope `I` item. `- None` SHALL be valid only under `**Out of scope Implementation Details**`, which still carries exactly one `- None` bullet when no item is out of scope.

#### Scenario: An empty Implementation Details field is not dispatchable

- **WHEN** a block carries `**Implementation Details**` as exactly `- None`
- **THEN** the block is not dispatchable

#### Scenario: Out of scope None stays valid

- **WHEN** a non-sliced block carries every agreed item in scope and `**Out of scope Implementation Details**` as exactly `- None`
- **THEN** the block satisfies the implementation-item rule

### Requirement: The block-hygiene clauses belong to the shared contract

The four block-hygiene clauses — no planning-artifact creation (`design.md`, `tasks.md`, `implementation.md`), no mutating git command, no subagent dispatch, and no direct edit of published `openspec/specs/**` as implementation work — SHALL be part of the dispatchable contract and SHALL be single-sourced in `sai/policies/block-hygiene-judgment.md`. Every other repository artifact, including other content under `openspec/`, SHALL remain ordinary implementation scope.

#### Scenario: Other OpenSpec content is ordinary scope

- **WHEN** a block requests work under `openspec/schemas/**` or `openspec/config.yaml`
- **THEN** no hygiene clause applies to that work

### Requirement: Direct Build dispatches only recorded dispatchable blocks

The Direct Build - Unattended route SHALL dispatch only blocks from the recorded inventory, which holds only dispatchable blocks, and SHALL run no block-shape refusal of its own; Bounded Recovery SHALL remain post-dispatch only.

#### Scenario: No route-local refusal before dispatch

- **WHEN** the user selects Direct Build - Unattended for a recorded change
- **THEN** the route dispatches the recorded block without a pre-dispatch compatibility refusal

### Requirement: Audit escalation blocks carry a proposed implementation item

When `/sai-3-implement` audit ingestion escalates findings as a Ready to Propose block, that block's `**Implementation Details**` SHALL carry one proposed `I1` item stating the correction the escalated findings imply, never `- None`; the user MAY refine it in `/sai-explore`.

#### Scenario: Escalation block is dispatchable

- **WHEN** audit ingestion composes an escalation block
- **THEN** its `**Implementation Details**` carries one proposed `I1` item
