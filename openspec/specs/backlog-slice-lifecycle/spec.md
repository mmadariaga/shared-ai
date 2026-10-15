# backlog-slice-lifecycle Specification

## Purpose
Support a GitHub-first lifecycle for agreed crystallized slices through faithful parent-and-child publication, complete read-only hierarchical import, durable selected-child provenance and separately authorized implementation-start responsibility.

## Requirements

### Requirement: GitHub slice publication preserves agreed work

GitHub, GitLab and Azure DevOps create with an explicitly crystallized slice set SHALL publish the existing whole-objective parent and one child per agreed slice, including a one-slice set. Each child's original block SHALL remain intact before appended relationship references, with lossless escaping when the provider stores HTML. The workflow SHALL NOT repeat decomposition approval. It SHALL show complete parent and child contents, destination, visibility, applicable Project or work-item type, and relationship representations and require explicit publication confirmation. Ordinary non-sliced requests and origin updates SHALL retain their existing paths.

#### Scenario: One agreed slice

- **WHEN** a supported provider receives an explicitly sliced one-block set and exact publication approval
- **THEN** it creates a parent and one child rather than treating the slice as ordinary single-item capture.

#### Scenario: No slices

- **WHEN** creation contains no explicitly crystallized slice set
- **THEN** the existing single-item publication path remains authoritative.

#### Scenario: Origin update

- **WHEN** the request updates an originating issue
- **THEN** the existing origin-update path remains authoritative without replacement-parent creation.

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

Complete publication SHALL return structured correspondence containing version, supported platform, parent URL and one unique child URL per change name with immediate dependencies. Each published issue SHALL carry the correspondence in a `sai-backlog-slices@1` marker identifying its role. Azure HTML SHALL carry a visible escaped pre block. Validation SHALL reject malformed, duplicate, self-referential, incomplete or cyclic correspondence. Canonical identities SHALL support GitHub, GitLab and Azure DevOps. Read-only lookup SHALL use explicit change-name correspondence rather than titles, verify matching parent correspondence and require a user decision for zero or multiple candidates.

#### Scenario: Publication correspondence recovered later

- **WHEN** a later workflow no longer has the original conversation mapping
- **THEN** published markers permit read-only recovery of the explicit change-name-to-child association and matching parent.

#### Scenario: Ambiguous correspondence

- **WHEN** an issue contains duplicate markers or invalid child correspondence
- **THEN** validation rejects the correspondence rather than selecting a marker or inferring identity from its title.

### Requirement: Hierarchical GitHub import is complete and preserves selection

GitHub, GitLab and Azure DevOps import SHALL retrieve a selected parent's complete content and every direct child's complete content, or a selected child's complete content and its parent as context without importing siblings automatically. It SHALL preserve titles, descriptions, comments, canonical identities, states, assignees and dependencies and exhaust required pages. Readable native children and dependencies SHALL be reconciled with written correspondence. Parent and child relationships SHALL be verified. The selected issue SHALL remain the origin. Required read failures SHALL produce incomplete or error outcomes; delivery SHALL remain pending until complete source delivery or a user-approved alternative.

#### Scenario: Parent with written and native children

- **WHEN** a parent has published written correspondence and additional readable native children
- **THEN** import includes both groups with their full contents and retains the selected parent as origin.

#### Scenario: Selected child

- **WHEN** the selected issue is a child
- **THEN** import delivers the child and parent context separately without replacing the selected origin or automatically loading siblings.

#### Scenario: Required child comment read fails

- **WHEN** a required child's comment page cannot be retrieved
- **THEN** the hierarchical import remains incomplete and the workflow reports the limitation and waits for a retry, delivery or stop decision.

#### Scenario: Required source read fails

- **WHEN** a required child, parent or comment page cannot be retrieved
- **THEN** import retains available selected content, reports an incomplete or error outcome and leaves delivery pending.

### Requirement: Actual child identities survive cold workflow dispatch

After completed set publication on any supported provider in Explore, the identity transport owner SHALL verify complete correspondence against the stored block set, attach each actual child URL as `**Backlog origin**`, validate and persist amendments, recompute hashes and reread the results before branch actions or route disclosure. It SHALL preserve other agreed block content and reject conflicting origins. Partial transport SHALL remain pending. Spec creation SHALL preserve the validator-returned selected issue URL as `backlog_origin` in change metadata without changing other metadata keys. Manual handoff SHALL display the amended stored block.

#### Scenario: Fresh standalone implementation

- **WHEN** a published slice on any supported provider proceeds through amended block delivery and spec creation into a fresh implementation invocation
- **THEN** the selected child identity is available from change metadata without title inference or conversation memory.

#### Scenario: Incomplete origin transport

- **WHEN** correspondence does not cover every stored block or an origin conflicts
- **THEN** transport remains pending and no branch action, route disclosure or cold dispatch proceeds.

### Requirement: Responsibility is checked only at implementation start

The user-facing coordinator SHALL inspect selected-child responsibility before the first pending implementation dispatch in standalone apply, chained apply and full Direct Build. Planning, publication, import and optional branch preparation SHALL NOT assign issues. A supplied parent SHALL require explicit child selection. No provenance SHALL trigger no remote operation. Inspection SHALL independently verify a native child and parent or published written correspondence, show the child URL and all assignees and preserve parent responsibility. On GitHub, inspection SHALL also accept a standalone leaf (an issue with no SAI correspondence marker, no native parent and no sub-issues) and SHALL report it with `parent: null`. GitHub inspection SHALL read the native parent and the first page of sub-issues through one GraphQL hierarchy query and SHALL decide only from a complete response. Any error or incomplete response SHALL fail the inspection. An unmarked GitHub issue with no native parent and at least one sub-issue, open or closed, SHALL be rejected as a parent. A marked issue whose correspondence declares native hierarchy SHALL be rejected when GitHub reports no native parent.

#### Scenario: Ordinary native child

- **WHEN** a selected child has a verified native parent but no SAI marker
- **THEN** responsibility inspection accepts its verified child identity without requiring a publication marker.

#### Scenario: No pending implementation

- **WHEN** apply has no pending Step
- **THEN** it performs no assignment-start operation.

#### Scenario: GitHub standalone leaf

- **WHEN** a selected GitHub issue has no SAI marker, a `null` native parent and no sub-issues
- **THEN** inspection returns `status: complete` with `parent: null`, and assignment follows the existing implementation-start flow.

#### Scenario: Unmarked GitHub issue with sub-issues

- **WHEN** a selected GitHub issue has no SAI marker, a `null` native parent and at least one open or closed sub-issue
- **THEN** inspection fails with the parent-responsibility error and no assignment is proposed.

#### Scenario: Incomplete or failed hierarchy response

- **WHEN** the GitHub hierarchy query fails or returns no issue, no `parent` field, a parent without a URL or no sub-issue page
- **THEN** inspection fails instead of treating the issue as a standalone leaf.

#### Scenario: Marked native issue without a native parent

- **WHEN** a selected GitHub issue carries an SAI marker declaring native hierarchy and GitHub reports no native parent
- **THEN** inspection fails with the unverified-parent error.

#### Scenario: Native child with its own sub-issues

- **WHEN** a selected GitHub issue has a native parent and also has sub-issues
- **THEN** inspection follows the native child flow and reports that parent.

### Requirement: Assignment has separate exact authorization and verification

An unassigned selected child SHALL require an Approve, Stop or Skip decision on the exact proposal to assign the authenticated user. Any existing assignee SHALL require a keep, replace or stop decision before implementation. Keep SHALL preserve and verify the exact approved assignee set without mutation, including multiple assignees or another user. Replace SHALL require approval of an exact proposal before assignment. On approval, `assign` SHALL accept the exact `choice` and `confirmation` that `propose-assignment` returned. Assignment SHALL change assignees only and SHALL NOT update titles, descriptions, labels or issue state. Verification SHALL precede implementation unless the user chose Skip; uncertain mutations SHALL be verified rather than blindly replayed. A provider rejection that proves no change was applied SHALL return `rejected`, and a transport error, timeout or server error SHALL return `uncertain` and lead to verification. After any failed or unverified assignment, the coordinator SHALL report the verified state and ask Retry, Skip or Stop, recommending Skip after `rejected`. Skip SHALL perform no remote operation, SHALL start implementation, and SHALL hold for the implementation stretch, so worker correction, resumption and replacement proceed without re-verifying or re-asking. A new slice or new implementation invocation SHALL ask again. Skip SHALL come only from a user answer: fast-track, injected fast-track and unattended route consent SHALL NOT replace assignment authorization and SHALL NOT choose Skip. After Skip, the closing report SHALL state that the work item stayed unassigned by user choice and list the assignees last verified.

#### Scenario: Keep multiple existing assignees

- **WHEN** the user approves keeping a child's existing multiple assignees
- **THEN** verification requires that exact set and implementation starts without an assignment mutation.

#### Scenario: Responsibility changes after approval

- **WHEN** current assignees differ from the approved proposal or retained keep target
- **THEN** verification blocks implementation and a fresh user decision is required.

#### Scenario: Unassigned child

- **WHEN** the user approves the exact authenticated-user assignment proposal
- **THEN** the coordinator executes the separate assignment operation and requires verified responsibility before technical dispatch.

#### Scenario: Proposed choice round-trips to assign

- **WHEN** `assign` receives the `choice: "assign"` and `confirmation` that `propose-assignment` returned for an unassigned child
- **THEN** the assignment proceeds instead of failing with an invalid assignment choice.

#### Scenario: Skip at the approval stop

- **WHEN** the user answers Skip to the Approve, Stop or Skip question for an unassigned child
- **THEN** implementation starts with no remote operation and the closing report states the work item stayed unassigned by user choice.

#### Scenario: Rejected assignment recommends Skip

- **WHEN** `assign` returns `rejected` because the provider proved no change was applied
- **THEN** the coordinator asks Retry, Skip or Stop with Skip as the recommended option.

#### Scenario: Skip survives worker replacement

- **WHEN** a worker is corrected, resumed or replaced within the implementation stretch after Skip
- **THEN** implementation continues without re-verifying assignment or asking the gate again.

#### Scenario: Fast-track does not choose Skip

- **WHEN** the gate is reached under `--fast-track`, injected fast-track or unattended route consent
- **THEN** the Approve, Stop or Skip question is still asked and Skip comes only from the user's answer.

### Requirement: Shared lifecycle ownership preserves excluded workflows

Claude Code and opencode SHALL install the same canonical lifecycle tools and owner contracts. Import SHALL retain read-only permissions. Explore SHALL retain user choices and calls to publication, identity transport, branch and implementation-start owners rather than duplicating provider mechanics. The lifecycle SHALL reuse an already-prepared initial branch and existing local-work protection. It SHALL NOT add automatic inter-slice switching, issue closure, WIP labels, issue-state transitions, parent assignment or changes to from-next-backlog-item selection; the only inter-slice switching SHALL be the user-chosen `per-slice` branch chain owned by Explore's branch preparation. GitLab and Azure DevOps SHALL retain existing simple workflows.

#### Scenario: Both harness projections

- **WHEN** installation expands for Claude Code and opencode
- **THEN** both include the new canonical tools and policies while importer permissions remain read-only.

#### Scenario: Imported work already has an initial branch

- **WHEN** selected work proceeds with an already-prepared initial branch and the user did not choose `per-slice`
- **THEN** the existing branch owner remains authoritative and the lifecycle introduces no automatic later-slice branch switching.

#### Scenario: Shared strategy reuses one initial branch

- **WHEN** the user chooses `shared` for a slice set
- **THEN** every slice reuses the one initial branch and no later-slice branch is created.

### Requirement: GitLab relationships distinguish written hierarchy from native blockers

Ordinary GitLab slice sets SHALL disclose written parent/child hierarchy and separately verified native `is_blocked_by` immediate dependency links. A failed native relationship operation SHALL require explicit approval before continuing with written relationships. Recovery SHALL preserve and disclose previously verified native links and SHALL NOT recreate already identified issues. Import SHALL reconcile readable native blockers with written correspondence. Only established native issue-link capability unavailability together with written dependency correspondence SHALL permit complete import without native discovery, and its limitation SHALL be disclosed. Permission failures, missing items, malformed pages and other failed native reads SHALL leave import pending.

#### Scenario: Additional readable native blocker

- **WHEN** written correspondence identifies an agreed blocker and native discovery returns an additional blocker
- **THEN** import preserves both dependency identities without remote mutation or selected-origin replacement.

#### Scenario: Native discovery fails without established unavailability

- **WHEN** GitLab native dependency inspection fails because of permissions, a missing item, timeout or malformed response
- **THEN** import remains incomplete even when written correspondence exists.

#### Scenario: Established unavailable issue-link capability

- **WHEN** native discovery establishes unsupported issue links and the issue carries written dependency correspondence
- **THEN** import uses the written dependencies and returns an explicit capability-unavailability notice.

### Requirement: Provider parity uses shared owners and isolated responsibility operations

GitLab and Azure DevOps SHALL expose shared set-publication and selected-child assignment operations through their existing registered adapters. Implementation-start ownership SHALL resolve and retain the selected provider rather than assume GitHub. Responsibility inspection SHALL verify the selected child and parent, authenticated identity and exact current assignees. Only GitHub SHALL additionally accept a standalone leaf with no parent. GitLab and Azure DevOps SHALL keep requiring a verified child and parent. Existing responsibility SHALL require a keep, replace or stop decision. Assignment SHALL require exact proposal approval, change only the selected child's assignees and verify the result before implementation unless the user chose Skip. Keep SHALL verify the exact approved set without mutation. Parent responsibility SHALL remain unchanged. GitHub, GitLab and Azure DevOps SHALL map a provider rejection that proves no change was applied to `rejected` and every other assignment failure to `uncertain` through the shared assignment contract, and SHALL offer Skip identically. Both Claude Code and opencode SHALL receive the canonical shared tools and contracts without expanded read-only import permissions.

#### Scenario: Existing child responsibility changes

- **WHEN** current responsibility differs from an approved keep or replacement proposal
- **THEN** verification or assignment rejects the stale approval and implementation waits for a new decision.

#### Scenario: Assignment outcome is uncertain

- **WHEN** the selected-child assignment request has an uncertain outcome
- **THEN** the adapter directs verification rather than blind replay and leaves parent responsibility unchanged.

#### Scenario: Mirrored installation

- **WHEN** the manifest expands for Claude Code and opencode
- **THEN** both install the shared set, import and assignment helpers while import access remains read-only.

#### Scenario: Definite rejection on any provider

- **WHEN** a GitHub, GitLab or Azure DevOps assignment fails with an error marked as a definite rejection
- **THEN** `assign` returns `rejected` with a no-change message and no verification operation.

#### Scenario: GitLab or Azure DevOps issue without a parent

- **WHEN** a selected GitLab or Azure DevOps issue has no verified parent
- **THEN** responsibility inspection does not accept it as a standalone leaf and keeps the child-and-parent requirement.

### Requirement: GitHub set publication verifies Project membership with direct reads

On GitHub, `publish-set`, `continue-set` and `recover-set` SHALL decide each issue's Project membership with the GitHub publication adapter's direct reads and SHALL NOT read the ProjectV2 `items` connection. Before adding an issue, publication SHALL check membership with the issue-side read, and an issue already in the destination Project, archived or not, SHALL count as verified with no add mutation. After the add mutation, publication SHALL verify with the bounded verification (one immediate read, then up to four more reads two seconds apart), using the direct item read when the response carries an item id and the issue-side read otherwise. When verification finds nothing, publication SHALL stop with `Project membership not verified` and leave that issue's Project operation pending. `recover-set` SHALL decide each Project operation with the issue-side read, leave it pending when no item of the destination Project is found, and never repeat the add mutation.

#### Scenario: Direct reads complete set publication

- **WHEN** each added child is visible to the direct item read on its first read
- **THEN** set publication completes with one add mutation per issue and no wait.

#### Scenario: Lagging visibility within the bound

- **WHEN** an added issue becomes visible to direct reads only after earlier reads miss it, within five reads
- **THEN** set publication waits two seconds between reads and completes.

#### Scenario: Unverified membership stops the set

- **WHEN** no verification read finds an added issue in the destination Project
- **THEN** set publication returns partial failure with `Project membership not verified` and that issue's Project operation pending.

#### Scenario: Recovery decides by the issue-side read

- **WHEN** `recover-set` runs after an unverified insertion
- **THEN** it marks the Project operation verified when the issue-side read finds the issue in the destination Project and leaves it pending otherwise, without repeating the add mutation.

#### Scenario: Pre-existing membership

- **WHEN** an issue is already in the destination Project before the add, archived or not
- **THEN** set publication counts it as verified and sends no add mutation for it.

#### Scenario: Other Projects and null Project items

- **WHEN** the issue-side read finds only items of other Projects or a `null` Project items connection
- **THEN** set publication treats the issue as absent from the destination Project and adds it.

### Requirement: GitHub assignment verification requires the approved parent

On GitHub, `verify-assignment` SHALL receive `expected_parent` for every choice: the `parent` URL of the approved proposal, or `null` for a standalone leaf. It SHALL report `verified: true` only when `expected_parent` equals the currently inspected parent and the existing assignee and confirmation checks pass. `assign` SHALL verify against the parent of its approved proposal. The `propose-assignment` confirmation SHALL cover the `parent` field. When the parent changes after approval, or an approved standalone leaf gains a sub-issue, verification SHALL NOT succeed and implementation SHALL stay unstarted.

#### Scenario: Parent changes after approval

- **WHEN** the native parent of an approved GitHub issue changes or disappears before `verify-assignment`, for a keep, assign or replace choice
- **THEN** verification does not succeed: it returns `verified: false` when re-inspection succeeds with a different parent, or fails with the inspection error when inspection rejects the changed hierarchy, and implementation does not start.

#### Scenario: Expected parent missing

- **WHEN** `verify-assignment` is called without an `expected_parent` equal to the current parent
- **THEN** it returns `verified: false`.

#### Scenario: Approved standalone leaf gains a sub-issue

- **WHEN** a GitHub standalone leaf approved with `parent: null` gains a sub-issue before verification
- **THEN** inspection rejects it as a parent, verification does not succeed, and implementation does not start.

#### Scenario: Assigned standalone leaf

- **WHEN** an approved standalone leaf is assigned to the authenticated user
- **THEN** `assign` verifies with `expected_parent: null` and reports `verified: true` with `parent: null`.
