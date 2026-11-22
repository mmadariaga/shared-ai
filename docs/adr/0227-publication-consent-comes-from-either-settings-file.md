# ADR 0227: Publication consent comes from either settings file

<!-- adr-index: supersedes 0224; refs 0222; refs 0223 -->

## Status

Accepted. Supersedes ADR 0224 (a granting publication value counts only from `.sai/settings.local.jsonc`). ADR 0222 (the `pr.publishAfterRun` setting answers the publication question of a run) and ADR 0223 (`publication.autoApprove` is a standing publication grant) apply again as written. ADR 0224 is not edited, because existing records are never edited in place.

## Context

ADR 0224 made a granting value of `publication.autoApprove` or `pr.publishAfterRun` count only from the personal `.sai/settings.local.jsonc`, to keep a committed file from consenting for people who never decided it. A user who enabled automatic publication in the shared `.sai/settings.jsonc` saw the agent refuse to apply it, so the setting had no effect and the behavior was surprising. The setup writer was not at fault: it already saved the consent keys to the local file, and the agent applied ADR 0224 as designed. The team wants one shared grant that holds for every contributor.

## Decision

1. **A granting value counts from either file.** `publication.autoApprove: true` and `pr.publishAfterRun: yes` grant consent whether `.sai/settings.jsonc` or `.sai/settings.local.jsonc` holds them. A key the local file holds wins over the same key in the base file, in both directions: a local `false` or `no` turns a shared grant off for that person, and a local `true` or `yes` grants over a shared `false` or `no`.
2. **Both keys are reverted together.** They are the same kind of grant (publish without asking); reverting only one would leave half of the flows ignoring the shared file, which is the reported problem.
3. **The readers drop the consent warning.** `readSettings` in `sai/tools/project-settings.js` merges the two keys like any other key. `consentWarning`, `consentWarnings`, `CONSENT_IDS`, `grants`, and `readAutoApprove` are removed, and `to-pr.js` and `to-backlog.js` add no consent warning to their `warnings`.
4. **The setup writer and screen use the ordinary rule.** The two keys go to the local file only when it already holds the key, otherwise to `.sai/settings.jsonc`; the local file is never created for them and the git-not-ignored warning is removed. The Auto-approve publication row shows and saves through the ordinary base/local override rules. `pr.publishAfterRun` gains no setup menu row.
5. **Safe-operations accepts the grant.** A granting value of either key, from either file, is a held confirmation for the publication that key covers, in `skills/universal/safe-operations/SKILL.md` and AGENTS.md § Safe Operations.
6. **What does not change.** The unattended refusals of `to-pr.js` (force push, default branch, detached HEAD, branch not at the shown commit, merged or closed request), the confirmation token binding the setting, the renewals after `stale-baseline` or `divergent` results, and an explicit request to review before publishing keep asking or refusing as before. `pr.publishAfterRun: ask`, an absent key, or an invalid value leaves the question in place. Claude Code and opencode apply the rule identically.

## Alternatives Considered

- **Keep ADR 0224 and ease the local path** (a setup row for `pr.publishAfterRun` saved locally, plus an offer to move a base-file grant to the local file) — rejected: the team wants a shared, team-wide grant.
- **Keep ADR 0224 and only improve the warning text** — rejected: the setting would still have no effect from the shared file.
- **Revert only one of the two keys** — rejected: the other flows would keep ignoring the shared file.

## Consequences

- Anyone who clones a repository whose shared settings file grants publication publishes pull requests and backlog issues without being asked. This is the accepted risk; a person opts out with a local `false` or `no`.
- A project that already holds the grant only in the local file keeps exactly its current behavior.
- A shared grant is visible in the committed file, and the confirmation token still invalidates when the setting changes between the shown proposal and the publication.

## Provenance

Change `restore-shared-publication-consent` (backlog issue 510), which reverses the decision of ADR 0224 for both consent keys.
