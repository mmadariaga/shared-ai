# ADR 0223: Publication auto-approve is a standing publication grant

<!-- adr-index: amends 0209b; amends 0222 -->

## Status

Accepted. Amends decision 4 of ADR 0209b (remote approval remains separate and exact) and amends ADR 0222 (the recorded publication answer serves unattended runs only), for a project whose settings hold `publication.autoApprove: true`. Both records stay in force for every project and invocation without that setting. ADR 0209b and ADR 0222 are not edited, because existing records are never edited in place.

## Context

Every interactive `/to-pr` and `/to-backlog` publication asks for approval of the exact proposal (`skills/universal/to-pr/SKILL.md`, `skills/universal/to-backlog/SKILL.md`). A team that always publishes what SAI drafts answers the same approval on every publication. ADR 0209b keeps that approval separate and exact, and ADR 0222 lets only a SAI coordinator that holds a recorded publication answer (`/sai-plan`, `/sai-build`, and Direct Build) publish without asking. The interactive skills have no way to hold a standing answer.

The interactive mode also refuses less than the unattended mode does: `to-pr.js` refused neither a merged or closed request nor every default-branch case, because the unattended guard applied only to `--unattended` calls.

## Decision

1. **One shared key covers both skills.** The boolean `publication.autoApprove` in `.sai/settings.jsonc` (an absent key reads as `false`, a non-boolean value is dropped with a warning and reads as `false`) governs `/to-pr` and `/to-backlog`, in a new `publication.*` namespace because it governs both skills, rather than one key per skill. With the key `true`, each skill shows the complete proposal and then publishes with no approval question; in `/to-pr` the setting skips both the message approval and the push approval.
2. **The tools read the key themselves and bind it into the token.** `to-pr.js` and `to-backlog.js` read the key on every call and report it as `auto_approve: true` in the proposals they return (`to-pr.js` `query` and `push-query`; `to-backlog.js` `query`, `query-update`, `query-set`, and `query-set-update`, through the GitHub, GitLab, and Azure DevOps adapters), before the proposal's digest is computed. The skill skips the question and passes the unchanged confirmation token. A key that changes between the shown proposal and the publication changes the digest, so the token no longer matches, nothing is published, and the skill shows a new proposal.
3. **`to-pr.js` adds the unattended refusals.** `push` and `publish` run `unattendedGuard` in addition to the unchanged token check when the key is `true`: a force push, the default branch, a detached HEAD, a branch that is not at the shown commit, and a merged or closed request each stop the publication with nothing published. The check lives in the tool, so it does not depend on the model following prose. The guard's refusal messages are worded so they fit both modes; the `refusal` causes are unchanged. A provider adapter without `closedRequests` cannot publish auto-approved.
4. **Renewals and explicit review still ask.** A proposal prepared again after a stale baseline or divergent remote content (someone else changed the issue) always asks for approval, whatever the key. A pending retry after a failed or uncertain publication is auto-approved again only when the remote content still matches the baseline. An explicit request of the user in the conversation to review before publishing makes the skill ask for that publication; the key stays unchanged.
5. **Explore drops the same question.** `/sai-explore` round 2 omits the publication approval question when the prepared `to-backlog` proposal reports `auto_approve: true`, and keeps the branch base question; round 1 still asks whether to create or update the backlog.
6. **What does not change.** The unattended publications of `/sai-plan`, `/sai-build`, and Direct Build, and `pr.publishAfterRun`, keep their behavior. Confirmations outside publication approval (issue assignment at implementation start and every `safe-operations` confirmation) stay asked. Write validation stays in `setup`: the "Backlog and PR settings" submenu gains an `Auto-approve publication` On/Off row, and `project-settings.js` gains no `set` subcommand. Claude Code and opencode apply the key identically.

## Alternatives Considered

- **`pr.autoApprove`** — rejected: the name suggests that only the PR is affected, while the key covers `/to-backlog` too.
- **Reading the setting through `project-settings.js get` in the skill** — rejected: a prose step the model can skip.
- **A tool-validated `--auto-approve` flag** — rejected: more change for no extra binding, because the token already binds the shown content.
- **The skill passes `--unattended` when the key is on** — rejected: the unattended mode skips the confirmation-token check, so the publication would no longer be bound to the shown proposal.
- **Only removing the question and keeping today's interactive refusals** — rejected: a merged or closed request would not stop an auto-approved publication.
- **Adding a `project-settings.js set` subcommand** — rejected: a write tool for every key is beyond this change.

## Consequences

- The setting is a standing project-level grant. It amends the exact-approval rule of ADR 0209b and ADR 0222 and the `to-backlog` rule that no general grant counts as confirmation; `docs/project-settings.md` names it as a second exception beside `pr.publishAfterRun` to its "Settings answer preferences only" principle.
- A provider adapter without `closedRequests` cannot publish auto-approved; every registered adapter has it today.
- A set-update or set publication whose recovery runs after the key changed fails its identity check conservatively and asks for a renewed review.

## Provenance

Change `publication-auto-approve-setting`, decision "Publication auto-approve is a standing publication grant".
