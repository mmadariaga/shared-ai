# ADR 0224: Publication consent comes only from the local settings file

<!-- adr-index: amends 0222; amends 0223 -->

## Status

Accepted. Amends ADR 0222 (the `pr.publishAfterRun` setting answers the publication question of a run) and ADR 0223 (`publication.autoApprove` is a standing project-level grant): a granting value of either key counts only from `.sai/settings.local.jsonc`. ADR 0222 and ADR 0223 are not edited, because existing records are never edited in place. Their other decisions stay in force.

## Context

ADR 0223 made `publication.autoApprove: true` in `.sai/settings.jsonc` a standing project grant, and ADR 0222 let `pr.publishAfterRun: yes` in the same file answer the publication question of `/sai-plan`, `/sai-build`, and `/sai-explore`. `.sai/settings.jsonc` is the shared file that a project commits. A granting value there therefore acts as push and publication consent for every contributor, and for anyone who clones a repository that sets it, although none of them decided it. That contradicts the held-confirmation rule of `skills/universal/safe-operations/SKILL.md` and AGENTS.md § Safe Operations: a held confirmation is an authorization the user already gave for the exact operation, and `--fast-track` or a general grant never stands in for it.

## Decision

1. **A granting value counts only from the local file.** `publication.autoApprove: true` and `pr.publishAfterRun: yes` grant consent only when `.sai/settings.local.jsonc`, the personal file, holds them. The same value in `.sai/settings.jsonc` grants nothing: `/sai-plan`, `/sai-build`, and the `/sai-explore` route selector ask their publication question, and `/to-pr` and `/to-backlog` require the explicit approval token.
2. **A restricting value counts from either file.** `publication.autoApprove: false` and `pr.publishAfterRun: no` or `ask` keep their effect from the base file, because the risk lies in granting and not in denying, so a team rule against automatic publication keeps working as a default. A key that the local file holds always wins over the same key in the base file: a local `false` overrides a base `true`, and a local `yes` overrides a base `no`. A team `no` is therefore a default that a personal `yes` overrides, not a prohibition.
3. **The rule lives in one place, the settings reader.** `readSettings` in `sai/tools/project-settings.js` keeps a granting value of the base file out of the merged values. `get`, `autoApprove`, `readGroup`, the `get` command, and the setup menu inherit it, so the three publication cards, which already read `get pr.publishAfterRun` and print its `warnings`, change nothing.
4. **Every reader reports the ignored value.** When the base file holds a granting value of either key, the read of that key returns one warning that names the key and says the value grants consent only from `.sai/settings.local.jsonc`, whether or not the local file also holds the key. The warning travels only with a read of the two keys, because a file-wide warning would appear in every command that reads any setting. `to-pr.js` and `to-backlog.js` add it to the `warnings` of their JSON output.
5. **The setup menu writes the local file.** The `Auto-approve publication` row saves `true` and `false` to `.sai/settings.local.jsonc`, creating it when it is absent, and shows the value that takes effect (a base `true` with no local value shows `off`). When git does not ignore the local file, the menu warns that committing it shares the grant with every clone, and it never edits `.gitignore` or `.sai/settings.jsonc` for these keys. The menu gains no `pr.publishAfterRun` row, because the project-settings screen excludes it; the settings writer sends that key to the local file too, and a person who holds it in the base file moves it by hand, guided by the warning.
6. **What does not change.** `skills/universal/safe-operations/SKILL.md` and AGENTS.md § Safe Operations stay as written; the settings code and docs move to match them. Every other setting keeps reading the merged base and local files. Claude Code and opencode apply the rule identically.

## Alternatives Considered

- **Keep the keys in the committed base file and amend safe-operations to accept a committed setting as a held confirmation** — rejected: it documents the clone and contributor risk and keeps it.
- **Let the base file only preselect the publication answer and confirm once per run, with only the local file skipping the question** — rejected: it adds a question to unattended runs for no gain over local-only.
- **Ignore the base file entirely for the two keys** — rejected: a team `no` would stop working.
- **Add a `pr.publishAfterRun` row to the setup menu** — rejected: it changes the menu capability and grows the scope.

## Consequences

- Teams that want the same publication behavior for everyone must enable it per person.
- A repository that already sets a granting value in the base file loses the grant until each person moves it to the local file; the warning says so on every read.
- A person who holds `pr.publishAfterRun: yes` in the base file moves it by hand, because the menu has no row for that key.
- A project that commits `.sai/settings.local.jsonc` shares the grant with every clone again; the menu warns about it, and ignoring the file stays the user's decision.

## Provenance

Change `local-only-publication-consent`, decisions "Consent comes only from the local file", "The base file may still restrict", "The setup menu gains no pr.publishAfterRun row", and "The rule lives in the readSettings merge" (backlog issue 487, finding F1 of issue 486).
