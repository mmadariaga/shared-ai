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

### Requirement: Shared bounded recovery of approved new-issue publication

For failed new-issue publication, individual or sliced sets, to-backlog SHALL follow one shared recovery sequence identically in Claude Code and opencode. Before recovery it SHALL warn with completed work, pending work, known issue links and the private receipt path. It SHALL verify directly using the existing recovery operation without asking permission for read-only queries, including partial outcomes. Verification MAY update the local receipt but SHALL NOT modify remote state. Verified complete publication SHALL be reported as success without another write. When all pending actions are verifiable and remain within the original approval, the workflow SHALL retry them once using the returned continuation token as confirmation and `automatic_retry: true`. After a failed retry it SHALL verify again and consult the user with completed and pending state.

#### Scenario: Partial publication has verifiable pending work

- **WHEN** a publication fails after completing some approved actions and verification establishes the remaining actions
- **THEN** the workflow warns, verifies without another permission question and performs one automatic retry of only those pending actions within the original approval.

#### Scenario: Work is already complete

- **WHEN** direct verification confirms the complete approved publication
- **THEN** the workflow reports success without repeating actions, requesting another approval or consuming the automatic retry.

#### Scenario: Retry remains incomplete

- **WHEN** the single automatic retry fails to complete publication
- **THEN** the workflow verifies again and consults the user with the verified remaining state instead of starting another automatic retry.

### Requirement: Automatic retry accounting is durable and publication-wide

The publication receipt SHALL record `automatic_retry_consumed: true` before executing an automatic retry. The allowance SHALL apply once to the whole approved publication, including pending creation, membership and relationships, not separately to each action. Recovery and re-entry SHALL retain the consumed allowance. Read-only verification and already-completed results SHALL consume nothing. Further continuation after consumption SHALL require an explicit user response and a fresh verified token without `automatic_retry`. The workflow SHALL NOT restart publication with a new receipt to bypass the limit.

#### Scenario: A retry fails after its allowance is recorded

- **WHEN** an automatic retry consumes its allowance and a remote operation then fails
- **THEN** subsequent recovery retains the consumed allowance and another automatic attempt is rejected before any pending remote write.

#### Scenario: User continues after exhaustion

- **WHEN** the user explicitly chooses further continuation after verification of an exhausted publication
- **THEN** the workflow uses the fresh verified confirmation token without the automatic retry flag and retains previously completed work.

### Requirement: Recovery preserves the original approval and uncertain outcomes

The covered retry SHALL preserve approved content, destination, visibility and relationship representation and retain exact authorization checks. A scope change, including written fallback for failed native relationships, SHALL require renewed full review and approval. A matching issue or an empty candidate list after a lost creation response SHALL NOT prove the creation outcome; an attempted creation with unknown outcome SHALL require user identification rather than duplicate-producing replay. Existing-issue content edits SHALL receive no automatic mutation retry under this contract and SHALL retain their update recovery rules.

#### Scenario: Relationship representation changes

- **WHEN** recovery proposes replacing native relationships with written references
- **THEN** automatic retry rejects the changed representation and the workflow obtains renewed approval before that change.

#### Scenario: Creation remains uncertain

- **WHEN** verification cannot identify the result of an attempted creation
- **THEN** the workflow preserves known results and consults the user without repeating the uncertain creation.

#### Scenario: Existing content update fails

- **WHEN** publication was an edit to existing issue content rather than a new-issue publication
- **THEN** verification remains read-only and the shared creation retry allowance does not authorize another update mutation.
