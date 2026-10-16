# backlog-publication Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Prepare a publication proposal for a caller without publishing

On request from any workflow, `to-backlog` SHALL run its inspection and review steps and return the full publication proposal instead of asking: destination, repository and visibility, final title and description (or the complete parent and children of a slice set), the baseline version for an update, the confirmation token, and the confirm / edit / cancel question its standalone confirmation prompt would ask. Preparation SHALL publish nothing, create no destination, and write no remote state. The skill SHALL NOT name or depend on its caller, and standalone use SHALL keep its existing confirmation flow unchanged.

#### Scenario: Caller requests preparation

- **WHEN** a workflow asks `to-backlog` to prepare a publication for a crystallized proposal
- **THEN** the skill returns the complete proposal with its confirmation token and question, and publishes nothing

### Requirement: Act only on a supplied answer bound to the exact proposal

`to-backlog` SHALL act on a supplied answer only when it binds the exact proposal the skill prepared: the same destination, the same final content, the same baseline version, and the same confirmation token. Confirm SHALL continue to publication with the unchanged token; cancel SHALL end without publication; edit SHALL return to inspection and ask a full confirmation of the edited proposal with the standalone prompt, never with a supplied answer. On a mismatch or a missing answer, the skill SHALL ask with its standalone prompt. A prior general grant, unattended mode, or an answer to a different question SHALL NOT count as confirmation. A slice-set publication SHALL accept either its existing explicit confirmation or a supplied answer that binds the entire set proposal.

#### Scenario: Supplied answer no longer matches

- **WHEN** a supplied confirm answer carries a confirmation token that differs from the prepared proposal's token
- **THEN** the skill does not publish and asks with its standalone confirmation prompt

#### Scenario: Supplied confirm matches

- **WHEN** a supplied confirm answer binds the prepared destination, content, baseline version, and confirmation token
- **THEN** the skill publishes with the unchanged token

### Requirement: Backlog skill files stay caller-agnostic

`skills/universal/to-backlog/SKILL.md` and `skills/universal/to-backlog/slice-set.md` SHALL contain no reference to `sai-explore` or Explore. The slice-set correspondence hand-off to `backlog-origin-transport.md` SHALL apply whenever the caller stores the blocks for later planning dispatch.

#### Scenario: Caller references are absent

- **WHEN** the to-backlog skill files are searched for `sai-explore` or `Explore`
- **THEN** no match is found
