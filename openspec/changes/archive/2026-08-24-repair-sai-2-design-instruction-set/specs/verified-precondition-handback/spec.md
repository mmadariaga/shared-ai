## MODIFIED Requirements

### Requirement: Verified evidence for improvised precondition hand-backs
An improvised, off-contract hand-back that claims an unmet precondition SHALL name the concrete project-relative file and key at issue. Before issuing it, the hand-back authoring surface SHALL have read that file and key and the destination command's current command card, instruction, or worker contract in the current invocation, and SHALL have confirmed from that read that the destination command actually writes the cited key. Reading a missing key is satisfied by inspecting that exact key path in an existing current file and establishing that it is absent; when the cited file itself is missing, the current-read check is unsatisfiable and the authoring surface SHALL escalate under the fallback requirement instead of issuing a hand-back. No durable verification record or new lifecycle payload field is required. Writer confirmation requires an explicit command-owned write responsibility; a command that only reads, checks, gates on, or forwards the key SHALL NOT qualify. A generic absence claim or an unread reference SHALL NOT qualify as evidence for a hand-back. A hand-back concerning a design-owned key SHALL also read the active design worker or step-local contract and confirm that the destination command writes that key.

#### Scenario: All three hand-back checks succeed
- **WHEN** an agent is about to send the user to another command because a precondition is unmet
- **THEN** the hand-back names the concrete file and key, the current invocation has read them, and the destination command's contract confirms that command writes the cited key
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

