> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`skills/universal/to-backlog/slice-set.md` promised that an originating issue never gets a replacement parent, but `publish-set` always created a new parent as item 0 (`sai/tools/backlog-set-github.js` `publish`, `sai/tools/backlog-provider-set.js` `perform`) on GitHub, GitLab, and Azure DevOps, so a `/sai-explore` conversation that started from an existing issue and crystallized a slice set left the user with a duplicate parent or an origin without children.

## What Changes

- Slice-set publication accepts an existing originating issue as item 0 on GitHub, GitLab, and Azure DevOps: `query-set` / `publish-set` take the canonical origin URL as `origin` and its update-read baseline as `origin_baseline`, derive the destination from the origin, record the origin in the receipt before any creation, and never create item 0 or a replacement parent, including on resumption.
- New provider-neutral module `sai/tools/backlog-set-origin.js` runs the pre-write origin checks and supplies the origin receipt item, the body-acceptance set, the destination re-check, and the relation text.
- Each child is linked to the origin with the provider's existing parent mechanism (GitHub sub-issue, Azure DevOps `Hierarchy-Reverse` relation, GitLab written `Parent:` references).
- The origin's description is rewritten last, after every child exists and is linked, with the agreed whole-objective content, `Child:` lines, and the parent marker; its title and state are kept and it is never closed. The completion report names the origin separately from created issues, and GitHub keeps the origin's own Project membership.
- Publication stops before any write when the origin already carries a parent marker, is closed, is not editable by the authenticated user (verified read-only on every provider: GitHub `viewerCanUpdate` and archived-repository checks, GitLab `userPermissions.updateWorkItem`, Azure DevOps validate-only revision test), belongs to another provider or destination, or changed since its baseline was read (`stale-baseline`).
- Existing native children without a SAI marker stay linked and are listed in the proposal.
- An origin that is itself a published child keeps its parent link: its new parent marker carries the earlier child correspondence as `child_of` (validated in `backlog-slice-identity.js`, exposed through `identity.upper`), and import, recovery, and slice lookup read child-role correspondence through it.
- `attachBacklogOrigins` in `sai/tools/ready-to-propose.js` replaces a block's `Backlog origin` equal to the adopted parent with the child URL instead of refusing it.
- `skills/universal/to-backlog/SKILL.md` and `slice-set.md` route a slice set with an originating issue to origin-as-parent publication; `sai/commands/explore/steps/route-selector.md` names the originating issue to `to-backlog`; `sai/policies/backlog-origin-transport.md`, `docs/backlog.md`, and `docs/commands/to-backlog.md` describe the behavior.
- Tests cover origin-as-parent publication, pre-write stops, interrupted resumption, child-origin correspondence, the unchanged no-origin path, and origin transport.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `backlog-slice-lifecycle`: slice-set publication adopts an originating issue as the parent, stops before any write when the origin cannot take a set, and keeps an adopted child origin's earlier correspondence.
- `to-backlog-conversation-capture`: an originating issue with a crystallized slice set selects origin-as-parent set publication instead of update mode.
- `issue-origin-preservation`: origin transport replaces a block origin equal to the adopted parent with the child URL.
- `explore-pre-route-actions`: the backlog action names the originating issue to slice-set publication.
- `to-backlog-github-publication`: a sliced set with an originating issue publishes through the set operations with the origin as parent; restricted update mode applies only without a slice set.
- `to-backlog-issue-format`: origin-as-parent set publication replaces the origin description after confirmation and is not an update.
- `azuredevops-backlog-publication`: an originating work item keeps its own type as the set parent; only children use the selected type.

## Impact

New files:
- `sai/tools/backlog-set-origin.js`

Modified files:
- `sai/tools/backlog-provider-set.js`
- `sai/tools/backlog-set-github.js`
- `sai/tools/backlog-slice-identity.js`
- `sai/tools/backlog-provider-import.js`
- `sai/tools/from-backlog-github.js`
- `sai/tools/from-backlog-gitlab.js`
- `sai/tools/ready-to-propose.js`
- `sai/tools/to-backlog-github.js`
- `sai/tools/to-backlog-gitlab.js`
- `sai/tools/to-backlog-azuredevops.js`
- `skills/universal/to-backlog/SKILL.md`
- `skills/universal/to-backlog/slice-set.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/policies/backlog-origin-transport.md`
- `docs/backlog.md`
- `docs/commands/to-backlog.md`
- `test/backlog-slice-provider-parity.test.js`
- `test/github-backlog-slice-lifecycle.test.js`

Known limitations accepted:
- GitLab children stay linked by written references only, with no native hierarchy.
- A user who wants a new parent instead of the origin must publish without an origin.
- The origin's original description text is replaced after the user confirms the proposal that shows the new body.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
