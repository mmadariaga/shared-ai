# ADR 0209b: Publish complete plans on the change branch

<!-- adr-index: refs 0199, refs 0040, refs 0044, refs 0045, refs 0146b -->

## Status

Accepted. Refs ADRs 0199, 0040, 0044, 0045, and 0146b. Ordinary planning segment ignore rules and existing explicit-approval invariants remain unchanged; historical records are not amended.

## Context

The composed `/sai-plan` workflow prepares specifications and design before implementation. Reviewers need the complete plan, but ordinary segment commits omit ignored documents. Publishing only the proposal can therefore leave specifications, design, tasks, interfaces, control metadata, and an optional overview unavailable for review.

The plan and its later implementation belong to the same change. A separate documentation branch and request would split their review history. The existing `/to-pr` workflow already resolves destinations, matches requests, binds approvals to exact content and branch state, and separates push outcomes from request publication. Draft support must work on GitHub, GitLab, and Azure DevOps rather than depend on the chosen provider.

## Decision

1. **Planning finishes before the optional offer.** The `/sai-plan` coordinator owns one offer after successful planning, including when Explore follows it. The existing completion literal closes the planning report, not the interaction. The planning run closes before the offer and any accepted publication continuation. Failed, stopped, or blocked plans make no offer; standalone spec and design commands make none. Declining or cancelling leaves planning complete.
2. **Reuse the change branch and `/to-pr`.** Acceptance loads the command-owned `sai/commands/plan/publication.md` continuation. It follows `/to-pr` on the current change branch and resolves the destination through that workflow. The same unique matching request carries plan review and later implementation review. Multiple matches require clarification; the workflow creates no duplicate, separate documentation branch, or implementation run, and never automatically marks the request ready.
3. **Authorize exact plan inclusion locally.** `to-pr.js plan-query` inventories the current change's plan documents, including `.openspec.yaml`, specifications, and the overview when present. It binds paths, content hashes, modes, ignored state, owned index entries, source branch, and HEAD to an approval token. After presentation and explicit local inclusion approval, `plan-commit` builds a commit through a private index. Only the listed ignored paths may be force-included. The real index is synchronized only for owned paths; unrelated staging and working files remain intact. Ordinary segment commits still respect ignore rules and never force-add.
4. **Remote approval remains separate and exact.** The offer authorizes preparation only, and local inclusion approval authorizes neither push nor request mutation. Before remote approval, the workflow shows destination, branches, complete content, included files, and all other committed branch changes. The existing publisher binds its approval tokens to the current proposal and push state. Changed details require renewed confirmation; history is never force-pushed. Converting an existing ready request to draft is explicitly included in the publication confirmation.
5. **Verify draft state on every supported provider.** GitHub uses REST draft creation and GraphQL conversion with the verified PR node ID. GitLab uses its supported `Draft: ` title write and reads back the draft flag; Azure DevOps retains its `isDraft` mechanism. A normal request or unverified draft state does not satisfy draft publication. Read-only recovery precedes any retry after uncertain effects, and push, request, and draft outcomes remain distinct.
6. **Keep both harnesses aligned.** Claude Code and opencode share the continuation, publisher, and manifest-declared access. Each presents approvals through its native picker. Publication instructions load only after acceptance, leaving ordinary planning unattended through completion.

## Alternatives Considered

- **A separate documentation-only branch and request** — rejected: it splits plan and implementation review instead of maintaining one request and branch.
- **Publish only non-ignored documents** — rejected: it can omit most of the plan and prevent meaningful review.
- **Draft publication only on Azure DevOps** — rejected: the workflow must support GitHub and GitLab as well.
- **A second publication system or publication as a planning gate** — rejected: a second publisher duplicates destination, approval, and recovery mechanisms; a planning gate would make optional publication determine whether planning completed.

## Consequences

- Reviewers can inspect the full current-change plan before implementation on the request that later carries the implementation.
- A request from the existing branch also includes other committed changes on that branch. The workflow discloses them and does not describe the request as necessarily documents-only.
- The ignored-file exception is narrow but meaningful: explicitly approved plan documents become tracked without changing ignore rules. It does not authorize inclusion of unrelated files or change ordinary segment behavior.
- Local inclusion and remote publication need separate approvals. A later cancellation or failed publication can leave an authorized local commit or a verified push in place; the workflow reports confirmed effects rather than rolling them back automatically.
- Provider-specific draft writes require readback. Uncertain conversion or publication remains unresolved until inspection establishes the outcome; it is not permission to repeat creation.

## Provenance

Change `plan-draft-pr-offer`, decision "Publish complete plans on the change branch".
