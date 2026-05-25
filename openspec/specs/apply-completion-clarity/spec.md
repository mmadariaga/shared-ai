# apply-completion-clarity Specification

## ADDED Requirements

### Requirement: Apply agent completion message SHALL explicitly include human verification gate review and commit steps

When `/sai-4-apply` reaches its completion phase, the agent's stop condition SHALL require that: (1) the implementation is done, (2) all human verification gates have been reviewed, and (3) commits are done. The completion message printed to the user SHALL remain: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

#### Scenario: Apply agent reaches completion

- **WHEN** `/sai-4-apply` has applied all implementation steps, all human verification gates have been reviewed by the user, and all commits have been created
- **THEN** the agent prints exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready." and stops

#### Scenario: Human verification gates not yet reviewed

- **WHEN** `/sai-4-apply` has applied implementation steps but human verification gates have not been reviewed
- **THEN** the agent MUST NOT print the completion message — it must present the verification gates to the user first
