# verified-precondition-handback Specification

## Purpose
TBD

## Requirements

### Requirement: Verified evidence for improvised precondition hand-backs

An improvised, off-contract hand-back that claims an unmet precondition SHALL name the concrete project-relative file and key at issue. Before issuing it, the hand-back authoring surface SHALL have read that file and key and the destination command's current command card, instruction, or worker contract in the current invocation, and SHALL have confirmed from that read that the destination command actually writes the cited key. Reading a missing key is satisfied by inspecting that exact key path in an existing current file and establishing that it is absent; when the cited file itself is missing, the current-read check is unsatisfiable and the authoring surface SHALL escalate under the fallback requirement instead of issuing a hand-back. No durable verification record or new lifecycle payload field is required. Writer confirmation requires an explicit command-owned write responsibility; a command that only reads, checks, gates on, or forwards the key SHALL NOT qualify. A generic absence claim or an unread reference SHALL NOT qualify as evidence for a hand-back. A hand-back concerning a design-owned key SHALL also read the active design worker or step-local contract and confirm that the destination command writes that key.

#### Scenario: All three hand-back checks succeed

- **WHEN** an agent is about to send the user to another command because a precondition is unmet
- **THEN** the hand-back names the concrete file and key, the current invocation has read them, and the destination command's contract confirms that command writes the key
- **AND** the agent may issue the hand-back as an improvised recovery direction

#### Scenario: The approval key is owned by the current destination command

- **WHEN** a coordinator considers sending the user backward because `openspec/changes/{change-name}/.openspec.yaml` lacks `approval.specs.approved_at`, and the active design worker or step-local contract declares that `/sai-2-design` writes `approval.specs.approved_at`
- **THEN** it SHALL read the file, key, and active design worker or step-local contract in the current invocation and confirm that `/sai-2-design` is the destination command that writes `approval.specs.approved_at`
- **AND** it SHALL NOT substitute a different command merely because that command creates or reviews the surrounding proposal/spec artifacts

#### Scenario: Candidate destination only reads or forwards the key

- **WHEN** a coordinator has read the cited file and key but the proposed `/sai-1-spec` destination only creates or reviews proposal/spec artifacts and does not write `approval.specs.approved_at`
- **THEN** it SHALL ask the user a question under `@sai/policies/question-context.md`
- **AND** it SHALL not issue the proposed hand-back

#### Scenario: active-design-writer-is-verified
- **WHEN** a hand-back cites a design-owned artifact key
- **THEN** the current invocation verifies the key and confirms writer ownership from the active worker or step contract.

### Requirement: Escalate when hand-back evidence is incomplete

When any of the file-and-key naming, current-read, or destination-writer checks cannot be satisfied, the coordinator or other command surface authoring or relaying the improvised hand-back SHALL ask the user a question instead of issuing it. A relaying surface SHALL independently repeat the file/key and destination-writer checks in the current invocation; it SHALL NOT rely on an upstream assertion or unverified conversation text as transferred evidence. The question SHALL comply with `@sai/policies/question-context.md`, carry the essential current state needed for the user to decide, and state that the verification evidence is incomplete. This fallback SHALL add no new approval or prerequisite gate to a command's successful path.

#### Scenario: The cited file or key was not read

- **WHEN** the hand-back authoring or relaying surface can see or infer that a precondition may be unmet but has not read the concrete file and key in the current invocation
- **THEN** it SHALL ask the user what to do using a question that identifies the unresolved verification state
- **AND** it SHALL NOT tell the user to run another command to satisfy the unverified claim

#### Scenario: The cited file does not exist

- **WHEN** an improvised hand-back cites a key in a file that is absent from the current project state
- **THEN** the current-read check SHALL be treated as unsatisfiable
- **AND** the hand-back authoring or relaying surface SHALL ask the user a question under `@sai/policies/question-context.md` instead of issuing the hand-back

#### Scenario: The destination writer cannot be confirmed

- **WHEN** the concrete file and key have been named and read but the destination command's current command card, instruction, or worker contract does not confirm that the command writes that key
- **THEN** the hand-back authoring or relaying surface SHALL ask the user a question under `@sai/policies/question-context.md`
- **AND** it SHALL not issue a hand-back based on the current evidence

### Requirement: Separate canonical policy from written STOP contracts

The verified-precondition rule SHALL live in its own policy file. Every existing routed command card under `sai/commands/` SHALL reference that policy unconditionally, including `coordinator.md`, `worker.md`, and any retained `invocation.md`. A routed phase without an invocation card SHALL remain covered by its existing coordinator and worker cards.

The verified-precondition rule SHALL live in its own policy file. Every routed command card (`coordinator.md`, `worker.md`, and `invocation.md`) and every utility command card (`body.md`) under `sai/commands/` SHALL reference that policy unconditionally. Non-card policy files, templates, and project-local skill files are excluded from the reference location; command-local `instructions.md` content loaded by a referencing card remains governed by the policy. The rule SHALL govern only improvised, off-contract hand-backs; it SHALL NOT be copied into `sai/orchestration/command-runner.md` or `sai/orchestration/worker-core.md`, treated as a lifecycle terminal, or used to rewrite any existing fixed STOP literal, contract-authored hand-back, approval gate, or file-existence check.

#### Scenario: Existing file-existence STOP remains unchanged

- **WHEN** a command reaches an existing written STOP that checks for a required artifact file
- **THEN** the command SHALL retain that STOP's exact wording and behavior
- **AND** the verified-precondition policy SHALL not convert the STOP into a question or add a hand-back requirement to its happy path

#### Scenario: Canonical lifecycle files remain separate

- **WHEN** the verified-precondition policy's lifecycle exclusions are audited
- **THEN** it identifies `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md` as the canonical neutral contracts and does not name their retired root paths

#### Scenario: Contract-authored hand-back remains outside the improvised rule

- **WHEN** a command's written contract explicitly defines a hand-back destination and its behavior
- **THEN** that contract-authored hand-back SHALL remain unchanged
- **AND** the new policy SHALL apply only when an agent invents an additional precondition hand-back not defined by the contract

#### Scenario: Normal command path has no unmet precondition

- **WHEN** all declared prerequisites are satisfied and the command can continue normally
- **THEN** the command SHALL proceed without an additional question, approval gate, or evidence check introduced by this capability

#### Scenario: Implement policy coverage follows the active cards

- **WHEN** the routed command-card inventory is audited
- **THEN** the implementation phase is validated through `coordinator.md` and `worker.md` without requiring a deleted invocation card.

### Requirement: Glossary records the resolved hand-back term

When the canonical verified-precondition policy is present in the repository, the project-root `GLOSSARY.md` SHALL document **Verified Precondition Hand-back** using the canonical glossary format, including a concise definition and rejected aliases. The glossary entry SHALL describe the evidence-bound hand-back concept without adding lifecycle, recovery, or approval semantics.

#### Scenario: Capability term is documented

- **WHEN** the canonical verified-precondition policy is present in the repository
- **THEN** `GLOSSARY.md` contains the **Verified Precondition Hand-back** term in the language section with its `*Avoid*` aliases
- **AND** no unrelated glossary terms are changed by this capability
