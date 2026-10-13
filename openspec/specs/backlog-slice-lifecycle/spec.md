# backlog-slice-lifecycle Specification

## Purpose
Support a GitHub-first lifecycle for agreed crystallized slices through faithful parent-and-child publication, complete read-only hierarchical import, durable selected-child provenance and separately authorized implementation-start responsibility.

## Requirements

### Requirement: GitHub slice publication preserves agreed work

GitHub create with an explicitly crystallized slice set SHALL publish the existing whole-objective parent and one child per agreed slice, including a one-slice set. Each child's original block SHALL remain intact before appended relationship references. The workflow SHALL NOT repeat decomposition approval. It SHALL show complete parent and child contents, destination, visibility, Project and relationship representations and require explicit publication confirmation. Ordinary non-sliced requests, origin updates and other providers SHALL retain their existing paths.

#### Scenario: One agreed slice

- **WHEN** GitHub creation receives an explicitly sliced one-block set and exact publication approval
- **THEN** it creates a parent and one child rather than treating the slice as ordinary single-item capture.

#### Scenario: No slices

- **WHEN** creation contains no explicitly crystallized slice set
- **THEN** the existing single-item publication path remains authoritative.

### Requirement: Relationship operations are separately verified and truthfully represented

Set publication SHALL validate dependencies and use blocker-first order. Issue creation, Project membership, written references, native hierarchy and native dependency links SHALL be separate verifiable operations. It SHALL use native representations when supported and otherwise disclose written references. Only agreed immediate dependency edges SHALL be represented. A native relationship failure SHALL require approval of a changed written representation before continuation and SHALL preserve existing native links.

#### Scenario: Native relationships unavailable

- **WHEN** capability inspection finds no supported native hierarchy or dependency representation
- **THEN** the reviewed proposal declares written references without presenting them as native relationships.

#### Scenario: Native relation fails after creation

- **WHEN** a native relationship operation fails after issues have been created
- **THEN** recovery reports existing results and proposes a disclosed written fallback that requires fresh confirmation.

### Requirement: Partial set publication preserves results and requires approved continuation

Publication SHALL retain a private receipt and report created issues and pending operations after partial or uncertain results. Recovery SHALL reread remote results without remote mutation. A lost creation response SHALL return candidates and require explicit identification rather than another creation. Continuation SHALL require the unchanged approval token for verified pending operations and SHALL reverify results before performing them. Changed destination, identity, visibility or issue content SHALL stop continuation for renewed review.

#### Scenario: Lost creation response

- **WHEN** issue creation may have succeeded but its response is lost
- **THEN** recovery returns matching candidates and no new creation occurs until the existing result is identified and pending work is approved.

#### Scenario: Remote content changed

- **WHEN** recovery finds issue content that differs from the approved source or relationship content
- **THEN** continuation stops without overwriting the changed issue or creating a replacement.

### Requirement: Published correspondence is durable and explicitly validated

Complete publication SHALL return structured correspondence containing version, GitHub platform, parent URL and one unique child URL per change name with immediate dependencies. Each published issue SHALL carry the correspondence in a `sai-backlog-slices@1` marker identifying its role. Validation SHALL reject malformed, duplicate, self-referential, incomplete or cyclic correspondence. Read-only lookup SHALL use explicit change-name correspondence rather than titles and SHALL require a user decision for zero or multiple candidates.

#### Scenario: Publication correspondence recovered later

- **WHEN** a later workflow no longer has the original conversation mapping
- **THEN** published markers permit read-only recovery of the explicit change-name-to-child association.

### Requirement: Hierarchical GitHub import is complete and preserves selection

GitHub import SHALL retrieve a selected parent's complete content and every direct child's complete content, or a selected child's complete content and its parent as context without importing siblings automatically. It SHALL preserve titles, descriptions, comments, canonical identities, states, assignees and dependencies and exhaust required connection pages. Readable native children SHALL be reconciled with written correspondence, including native children absent from that correspondence. The selected issue SHALL remain the origin. Required read failures SHALL produce incomplete or error outcomes; delivery SHALL remain pending until complete source delivery or a user-approved alternative.

#### Scenario: Parent with written and native children

- **WHEN** a parent has published written correspondence and additional readable native children
- **THEN** import includes both groups with their full contents and retains the selected parent as origin.

#### Scenario: Selected child

- **WHEN** the selected issue is a child
- **THEN** import delivers the child and parent context separately without replacing the selected origin or automatically loading siblings.

#### Scenario: Required child comment read fails

- **WHEN** a required child's comment page cannot be retrieved
- **THEN** the hierarchical import remains incomplete and the workflow reports the limitation and waits for a retry, delivery or stop decision.

### Requirement: Actual child identities survive cold workflow dispatch

After completed GitHub set publication in Explore, the identity transport owner SHALL verify complete correspondence against the stored block set, attach each actual child URL as `**Backlog origin**`, validate and persist amendments, recompute hashes and reread the results before branch actions or route disclosure. It SHALL preserve other agreed block content and reject conflicting origins. Partial transport SHALL remain pending. Spec creation SHALL preserve the validator-returned selected issue URL as `backlog_origin` in change metadata without changing other metadata keys. Manual handoff SHALL display the amended stored block.

#### Scenario: Fresh standalone implementation

- **WHEN** a published slice proceeds through amended block delivery and spec creation into a fresh implementation invocation
- **THEN** the selected child identity is available from change metadata without title inference or conversation memory.

#### Scenario: Incomplete origin transport

- **WHEN** correspondence does not cover every stored block or an origin conflicts
- **THEN** transport remains pending and no branch action, route disclosure or cold dispatch proceeds.

### Requirement: Responsibility is checked only at implementation start

The user-facing coordinator SHALL inspect selected-child responsibility before the first pending implementation dispatch in standalone apply, chained apply and full Direct Build. Planning, publication, import and optional branch preparation SHALL NOT assign issues. A supplied parent SHALL require explicit child selection. No provenance SHALL trigger no remote operation. Inspection SHALL independently verify a native child and parent or published written correspondence, show the child URL and all assignees and preserve parent responsibility.

#### Scenario: Ordinary native child

- **WHEN** a selected child has a verified native parent but no SAI marker
- **THEN** responsibility inspection accepts its verified child identity without requiring a publication marker.

#### Scenario: No pending implementation

- **WHEN** apply has no pending Step
- **THEN** it performs no assignment-start operation.

### Requirement: Assignment has separate exact authorization and verification

An unassigned selected child SHALL require approval to assign the authenticated user. Any existing assignee SHALL require a keep, replace or stop decision before implementation. Keep SHALL preserve and verify the exact approved assignee set without mutation, including multiple assignees or another user. Replace SHALL require approval of an exact proposal before assignment. Assignment SHALL change assignees only and SHALL NOT update titles, descriptions, labels or issue state. Fast-track and unattended consent SHALL NOT replace assignment authorization. Verification SHALL precede implementation; uncertain mutations SHALL be verified rather than blindly replayed.

#### Scenario: Keep multiple existing assignees

- **WHEN** the user approves keeping a child's existing multiple assignees
- **THEN** verification requires that exact set and implementation starts without an assignment mutation.

#### Scenario: Responsibility changes after approval

- **WHEN** current assignees differ from the approved proposal or retained keep target
- **THEN** verification blocks implementation and a fresh user decision is required.

#### Scenario: Unassigned child

- **WHEN** the user approves the exact authenticated-user assignment proposal
- **THEN** the coordinator executes the separate assignment operation and requires verified responsibility before technical dispatch.

### Requirement: Shared lifecycle ownership preserves excluded workflows

Claude Code and opencode SHALL install the same canonical lifecycle tools and owner contracts. Import SHALL retain read-only permissions. Explore SHALL retain user choices and calls to publication, identity transport, branch and implementation-start owners rather than duplicating provider mechanics. The lifecycle SHALL reuse an already-prepared initial branch and existing local-work protection. It SHALL NOT add automatic inter-slice switching, issue closure, WIP labels, issue-state transitions, parent assignment or changes to from-next-backlog-item selection. GitLab and Azure DevOps SHALL retain existing simple workflows.

#### Scenario: Both harness projections

- **WHEN** installation expands for Claude Code and opencode
- **THEN** both include the new canonical tools and policies while importer permissions remain read-only.

#### Scenario: Imported work already has an initial branch

- **WHEN** selected work proceeds with an already-prepared initial branch
- **THEN** the existing branch owner remains authoritative and the lifecycle introduces no automatic later-slice branch switching.
