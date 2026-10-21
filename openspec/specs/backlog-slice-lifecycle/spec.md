# backlog-slice-lifecycle Specification

## Purpose
Support a GitHub-first lifecycle for agreed crystallized slices through faithful parent-and-child publication, complete read-only hierarchical import, durable selected-child provenance and separately authorized implementation-start responsibility.

## Requirements

### Requirement: GitHub slice publication preserves agreed work

GitHub, GitLab and Azure DevOps create with an explicitly crystallized slice set SHALL publish the existing whole-objective parent and one child per agreed slice, including a one-slice set. Each child's original block SHALL remain intact before appended relationship references, with lossless escaping when the provider stores HTML. The workflow SHALL NOT repeat decomposition approval. It SHALL show complete parent and child contents, destination, visibility, applicable Project or work-item type, and relationship representations and require explicit publication confirmation. Ordinary non-sliced requests and non-sliced origin updates SHALL retain their existing paths. A crystallized slice set with an originating issue SHALL publish under that issue as its parent instead of creating a new parent.

#### Scenario: One agreed slice

- **WHEN** a supported provider receives an explicitly sliced one-block set and exact publication approval
- **THEN** it creates a parent and one child rather than treating the slice as ordinary single-item capture.

#### Scenario: No slices

- **WHEN** creation contains no explicitly crystallized slice set
- **THEN** the existing single-item publication path remains authoritative.

#### Scenario: Origin update

- **WHEN** the request updates an originating issue without a crystallized slice set
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

Publication SHALL retain a private receipt and report created issues and pending operations after partial or uncertain results. Before recovery the workflow SHALL warn with completed and pending work and the receipt. Recovery SHALL reread remote results without remote mutation or an additional verification permission question. A lost creation response SHALL return candidates and require explicit identification rather than another creation. Continuation SHALL require the unchanged verified continuation token and SHALL reverify results before performing only pending operations. One automatic retry of verified pending creation, membership and relationships SHALL be covered by the original publication approval using `automatic_retry: true`. Its allowance SHALL be recorded durably before writes and SHALL apply to the whole publication, surviving recovery and re-entry. After an unsuccessful retry, the workflow SHALL verify again and require an explicit user response before further continuation. Changed destination, identity, visibility, issue content or relationship representation SHALL require renewed review. Already-complete publication SHALL return completion without remote writes or retry consumption.

#### Scenario: Lost creation response

- **WHEN** issue creation may have succeeded but its response is lost
- **THEN** recovery returns matching candidates and no new creation occurs until the existing result is identified and the remaining work is verified within an applicable approval.

#### Scenario: Remote content changed

- **WHEN** recovery finds issue content that differs from the approved source or relationship content
- **THEN** continuation stops without overwriting the changed issue or creating a replacement.

#### Scenario: Pending operations receive one automatic retry

- **WHEN** recovery verifies pending actions under the unchanged approved proposal and the receipt has an unused retry allowance
- **THEN** continuation with the exact token and automatic retry flag records consumption before executing pending actions and preserves all completed work.

#### Scenario: Exhaustion survives recovery across providers

- **WHEN** GitHub, GitLab or Azure DevOps recovery reopens a publication whose automatic retry was consumed
- **THEN** another automatic retry is rejected without remote writes and further continuation requires an explicit user response with the fresh verified token.

#### Scenario: Verified complete set

- **WHEN** continuation verifies that every approved set action is already complete without a requested fallback
- **THEN** it returns complete without requiring a pending-action token, making another mutation or consuming retry allowance.

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

On GitLab, inspection SHALL also accept a standalone leaf (a work item of any type with no SAI correspondence marker, no native parent and no native children) and SHALL report it with `parent: null`. For a work item without a written marker, GitLab inspection SHALL read the native parent and the first page of children through one GraphQL work-item hierarchy query over the adapter's existing authenticated transport and SHALL decide only from a complete response. A GraphQL error, a transport failure, a missing work item, a missing hierarchy widget, or a response without the `parent` or `children` field SHALL fail the inspection with `GitLab work item hierarchy could not be verified`. An unmarked GitLab work item with no native parent and at least one native child, open or closed, SHALL be rejected with `Selected work item has child items; parent responsibility is preserved`. An unmarked GitLab work item with a native parent SHALL keep being rejected. A GitLab work item with a written marker SHALL skip the native hierarchy read and keep the written-correspondence flow.

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

#### Scenario: GitLab standalone leaf

- **WHEN** a selected GitLab work item of any type has no SAI marker and a complete native hierarchy read shows no parent and no children
- **THEN** inspection returns `status: complete` with `parent: null`, and `propose-assignment`, `assign` and `verify-assignment` follow the existing implementation-start flow.

#### Scenario: Unmarked GitLab work item with native children

- **WHEN** a selected GitLab work item has no SAI marker, no native parent and at least one open or closed native child
- **THEN** inspection fails with `Selected work item has child items; parent responsibility is preserved` and no assignment is proposed or written.

#### Scenario: Incomplete GitLab hierarchy read

- **WHEN** the GitLab hierarchy query fails, returns a GraphQL error, no work item, no hierarchy widget, no `parent` field or no `children` page
- **THEN** inspection fails with `GitLab work item hierarchy could not be verified` instead of treating the work item as a standalone leaf.

#### Scenario: Unmarked GitLab work item with a native parent

- **WHEN** a selected GitLab work item has no SAI marker and the native hierarchy read reports a parent
- **THEN** inspection fails with the child-and-parent error as before.

#### Scenario: Marked GitLab work item

- **WHEN** a selected GitLab work item carries a written SAI correspondence marker
- **THEN** inspection performs no native hierarchy read and follows the existing written-correspondence flow.

### Requirement: Assignment has separate exact authorization and verification

An unassigned selected child SHALL require an Approve, Stop or Skip decision on the exact proposal to assign the authenticated user. Any existing assignee SHALL require a keep, replace or stop decision before implementation. Keep SHALL preserve and verify the exact approved assignee set without mutation, including multiple assignees or another user. Replace SHALL require approval of an exact proposal before assignment. On approval, `assign` SHALL accept the exact `choice` and `confirmation` that `propose-assignment` returned. Assignment SHALL change assignees only and SHALL NOT update titles, descriptions, labels or issue state. Verification SHALL precede implementation unless the user chose Skip; uncertain mutations SHALL be verified rather than blindly replayed. A provider rejection that proves no change was applied SHALL return `rejected`, and a transport error, timeout or server error SHALL return `uncertain` and lead to verification. After any failed or unverified assignment, the coordinator SHALL report the verified state and ask Retry, Skip or Stop, recommending Skip after `rejected`. Skip SHALL perform no remote operation, SHALL start implementation, and SHALL hold for the implementation stretch, so worker correction, resumption and replacement proceed without re-verifying or re-asking. A new slice or new implementation invocation SHALL ask again unless it holds a valid advance approval for its own selected issue or a set-level assignment answer of its crystallized set covers it. An advance approval collected before implementation start SHALL count as this decision only when it names the concrete user and every covered issue, binds an existing selected issue or the publication proposal whose issue was then created, and records an explicit assign, keep, replace or Skip choice; implementation start SHALL then verify the issue, the authenticated user and the current assignees against the approved context without a new question, and SHALL ask again for that authorization only on any conflict, a changed identity or responsibility, or a lapsed approval whose proposal was never published. Skip SHALL come only from a user answer: fast-track, injected fast-track and unattended route consent SHALL NOT replace assignment authorization and SHALL NOT choose Skip. After Skip, the closing report SHALL state that the work item stayed unassigned by user choice and list the assignees last verified.

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

#### Scenario: Valid advance approval is verified without a question

- **WHEN** implementation starts for a selected issue whose advance approval matches the verified issue, authenticated user and current assignees
- **THEN** the coordinator executes the approved choice and its verification without asking the Approve, Stop or Skip question again.

#### Scenario: Later slice covered by a set-level answer

- **WHEN** a later slice of the same crystallized set starts with a valid set-level assignment answer
- **THEN** it applies that answer without asking the assignment question again.

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

GitLab and Azure DevOps SHALL expose shared set-publication and selected-child assignment operations through their existing registered adapters. Implementation-start ownership SHALL resolve and retain the selected provider rather than assume GitHub. Responsibility inspection SHALL verify the selected child and parent, authenticated identity and exact current assignees. GitHub and GitLab SHALL additionally accept a standalone leaf with no parent, each proven by a complete native hierarchy read. The shared assignment contract SHALL accept a standalone leaf only on explicit adapter-proven standalone evidence, never on the absence of a written marker. Azure DevOps SHALL keep requiring a verified child and parent. Existing responsibility SHALL require a keep, replace or stop decision. Assignment SHALL require exact proposal approval, change only the selected child's assignees and verify the result before implementation unless the user chose Skip. Keep SHALL verify the exact approved set without mutation. Parent responsibility SHALL remain unchanged. GitHub, GitLab and Azure DevOps SHALL map a provider rejection that proves no change was applied to `rejected` and every other assignment failure to `uncertain` through the shared assignment contract, and SHALL offer Skip identically. Both Claude Code and opencode SHALL receive the canonical shared tools and contracts without expanded read-only import permissions.

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

- **WHEN** a selected Azure DevOps item has no verified parent, or a selected GitLab work item has no verified parent and is not proven a standalone leaf by a complete native hierarchy read
- **THEN** responsibility inspection does not accept it as a standalone leaf and keeps the child-and-parent requirement.

### Requirement: GitHub set publication verifies Project membership with direct reads

On GitHub, `publish-set`, `continue-set` and `recover-set` SHALL decide each issue's Project membership with the GitHub publication adapter's direct reads and SHALL NOT read the ProjectV2 `items` connection. Before adding an issue, publication SHALL check membership with the issue-side read, and an issue already in the destination Project, archived or not, SHALL count as verified with no add mutation. After the add mutation, publication SHALL verify with the bounded verification (one immediate read, then up to four more reads two seconds apart), using the direct item read when the response carries an item id and the issue-side read otherwise. When verification finds nothing, publication SHALL stop with `Project membership not verified` and leave that issue's Project operation pending. `recover-set` SHALL decide each Project operation with the issue-side read, leave it pending when no item of the destination Project is found, and never repeat the add mutation.

GitHub `publish-set` and `continue-set` SHALL share the single-issue publication adapter's membership check, insertion, and verification operation. A specific `Content already exists` or `Content already exists in this project` insertion error SHALL trigger fresh issue-side membership verification under the existing verification bound, not unconditional success. Eligibility SHALL require every structured GraphQL error to have the exact message `Content already exists` or `Content already exists in this project` with no path or a path starting with `addProjectV2ItemById`, or a trimmed command error matching exactly either message with optional repeated `gh:` prefixes and optional ` (addProjectV2ItemById)` suffix. Other errors SHALL retain their failure treatment. When fresh membership reads fail or do not confirm the destination Project, the operation SHALL return partial failure, retain the receipt and created issue identities, and leave the affected Project operation pending. Recovery and approved continuation SHALL reuse already-created issues rather than create replacements to resolve membership.

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

#### Scenario: Concurrent auto-add during set publication

- **WHEN** `publish-set` receives a qualifying duplicate-content insertion error for an issue added concurrently by auto-add
- **THEN** it verifies the issue's destination Project membership through fresh issue-side reads and continues only after confirmation.

#### Scenario: Concurrent auto-add during approved continuation

- **WHEN** approved `continue-set` retries a pending Project operation and receives a qualifying duplicate-content insertion error
- **THEN** it uses the same fresh membership verification as single publication and retains the existing issue identity without creating a replacement.

#### Scenario: Duplicate error leaves set membership unconfirmed

- **WHEN** fresh reads after a qualifying duplicate-content insertion error find no membership, find only another Project, or fail
- **THEN** the set result remains partial with the existing receipt, created issue identities, and affected Project operation pending for recovery and approved continuation.

#### Scenario: Other set insertion errors remain visible

- **WHEN** a set insertion fails with an error other than the qualifying duplicate-content response
- **THEN** publication or continuation reports the failure and retains partial results rather than treating the issue as a verified Project member.

#### Scenario: Observed duplicate message completes a verified set

- **WHEN** GitHub set publication receives `Content already exists in this project` in an eligible structured or command error and fresh issue-side reads confirm each issue in the requested Project
- **THEN** publication continues with the existing issues and completes without consuming an automatic recovery allowance for ordinary publication.

#### Scenario: Both duplicate messages preserve continuation results

- **WHEN** approved continuation receives either accepted duplicate message for a pending Project operation
- **THEN** it reuses the created issue and completes that operation only after fresh destination-membership confirmation, retaining partial results and the pending operation if verification fails.

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

### Requirement: Unread relationship state supplies no continuation authority

GitHub and provider-neutral set recovery SHALL NOT return an executable continuation token when required relationship verification is incomplete. It SHALL preserve known results and report the unavailable verification or the need to consult the user. Continuation SHALL reject missing or mismatched verified tokens before consuming the automatic retry allowance or writing remote state. A changed written fallback SHALL remain a separately approved operation, not an automatic retry.

#### Scenario: Relationship read fails

- **WHEN** recovery cannot verify the current hierarchy or dependency state required for ordinary continuation
- **THEN** it provides no executable continuation authority and automatic continuation performs no remote write and consumes no retry allowance.

### Requirement: GitLab and Azure DevOps assignment verification requires the approved parent

On GitLab and Azure DevOps, `verify-assignment` SHALL report `verified: true` only when the supplied `expected_parent` equals the currently inspected parent (`null` for a GitLab standalone leaf) and the existing assignee and confirmation checks pass. `assign` SHALL verify against the parent of its approved proposal. When the parent changes after approval, `expected_parent` is missing, or an approved GitLab standalone leaf gains a native child, verification SHALL NOT succeed and implementation SHALL stay unstarted.

#### Scenario: Expected parent differs from the current parent

- **WHEN** GitLab or Azure DevOps `verify-assignment` is called with an `expected_parent` that differs from the currently inspected parent, or without `expected_parent`
- **THEN** it returns `verified: false`.

#### Scenario: Approved GitLab standalone leaf gains a child

- **WHEN** a GitLab standalone leaf approved with `parent: null` gains a native child before verification
- **THEN** inspection rejects it as a parent, verification does not succeed, and implementation does not start.

#### Scenario: Assigned GitLab standalone leaf

- **WHEN** an approved GitLab standalone leaf is assigned to the authenticated user
- **THEN** `assign` verifies with `expected_parent: null` and reports `verified: true` with `parent: null`.

### Requirement: Slice-set publication adopts the originating issue as the parent

On GitHub, GitLab and Azure DevOps, set publication with an originating issue SHALL take the origin's canonical URL as an explicit `origin` request field, normalized by `backlog-slice-identity.normalize`, together with the `origin_baseline` read by the update read, and SHALL derive the target provider and repository or project from the origin. The receipt SHALL record the origin as item 0 before any creation, and publication and resumption SHALL never create item 0 or a replacement parent. Each child SHALL be linked to the origin with the mechanism its provider already uses for a new parent: a sub-issue link on GitHub, a `Hierarchy-Reverse` relation on Azure DevOps, and written `Parent:` references on GitLab. The proposal and its single confirmation digest SHALL cover the origin, its current baseline, its existing children, the children to create, and the origin's proposed new description. The origin's description SHALL be rewritten with the agreed whole-objective content, the `Child:` lines and a `sai-backlog-slices@1` marker with role `parent` as the last publication step, after every child exists and is linked; its title and state SHALL remain unchanged, and it SHALL never be closed, reopened or marked superseded. Existing children without a SAI marker SHALL stay linked and unchanged and SHALL be listed in the proposal. The completion report SHALL name the origin separately from created issues. A provider binding without origin support SHALL answer `blocked` with reason `origin-unsupported`.

#### Scenario: Origin becomes the set parent

- **WHEN** a crystallized slice set with an originating issue receives exact publication approval
- **THEN** the children are created and linked to the origin, the origin's description is rewritten last with the agreed objective, `Child:` lines and parent marker, and no new parent is created.

#### Scenario: Existing native children stay linked

- **WHEN** the originating issue already has children without a SAI marker
- **THEN** the proposal lists them, they stay linked and unchanged, and the new slices are added beside them.

#### Scenario: Interrupted publication keeps the origin text

- **WHEN** publication fails after some children were created and before the origin is rewritten
- **THEN** the origin keeps its original description, and resumption uses the same origin as item 0 without creating a replacement parent.

#### Scenario: Set without an origin

- **WHEN** a crystallized slice set has no originating issue
- **THEN** publication creates a new parent as before.

### Requirement: An originating issue that cannot take a set stops publication before any write

Before any write, set publication with an originating issue SHALL answer `blocked` with a `reason` when the origin already carries a `sai-backlog-slices@1` parent marker (`origin-already-published`, reporting the children already linked), is closed (`origin-closed`), cannot be read or is not editable by the authenticated user (`origin-unavailable`), or belongs to another provider or destination than the configured one (`origin-destination-mismatch`). Editability SHALL be verified on every provider by a read-only check before any write: the update read's `viewerCanUpdate` and archived-repository checks on GitHub, the work item's `userPermissions.updateWorkItem` query on GitLab, and a validate-only revision-test update that saves nothing on Azure DevOps; a check whose result cannot be verified SHALL count as not editable. When the origin's content differs from the supplied `origin_baseline`, or no baseline is supplied, publication SHALL answer `needs_input` (`stale-baseline` or `origin-baseline-required`) before any write.

#### Scenario: Origin already carries a published set

- **WHEN** the originating issue carries a `sai-backlog-slices@1` parent marker from an earlier publication
- **THEN** publication stops before any write, reports the children already linked, and writes no second marker or set of children.

#### Scenario: Closed origin

- **WHEN** the originating issue is closed
- **THEN** publication stops before any write, reports the state, and does not reopen the issue.

#### Scenario: Origin not editable

- **WHEN** the authenticated user cannot edit the originating issue on GitHub, GitLab or Azure DevOps, its GitHub repository is archived, or its edit permission cannot be verified
- **THEN** publication stops before any write with reason `origin-unavailable`.

#### Scenario: Configured destination differs from the origin

- **WHEN** the configured target differs from the originating issue's provider, repository or project
- **THEN** publication stops before any write with reason `origin-destination-mismatch`.

#### Scenario: Origin changed since it was read

- **WHEN** the originating issue's content no longer matches the supplied baseline
- **THEN** publication answers `stale-baseline` before any write and requires a new proposal and approval.

### Requirement: An adopted origin that is itself a published child keeps its earlier correspondence

When the originating issue carries a `sai-backlog-slices@1` marker with role `child`, set publication SHALL accept it as the new set's parent and SHALL keep its own parent link unchanged, so the new slices become grandchildren of that parent. The origin's new parent marker SHALL carry the earlier child correspondence as `child_of`, and its rewritten description SHALL keep the earlier `Parent:` and `Depends on:` lines. Correspondence validation SHALL accept `child_of` only on a parent marker, only as a child correspondence of the same platform that identifies the same issue and carries no `child_of` of its own. Import, recovery and slice lookup SHALL read an issue's child-role correspondence from its own child marker or from the `child_of` of its parent marker.

#### Scenario: Origin is a published child

- **WHEN** a slice set is published under an originating issue that is itself a published slice of another set
- **THEN** the origin keeps its parent link and earlier correspondence in `child_of`, and the new slices become its children.

#### Scenario: Earlier child identity stays recoverable

- **WHEN** a later import or slice lookup reads an origin whose parent marker carries `child_of`
- **THEN** it resolves the issue's earlier parent, dependencies and change name from that `child_of` correspondence.
