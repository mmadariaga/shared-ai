> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On self-hosted GitLab projects with `backlog.provider: gitlab`, `/to-pr` asked for the provider on every run and `/from-backlog 8` resolved to Azure DevOps, because `/to-pr` had no settings of its own and `/from-backlog` let positive provider matches outrank the configured provider. Every settings reader also looked for `.sai/settings.jsonc` only in the working directory, so subdirectories and linked worktrees (where `.sai/` is often untracked and absent) lost the settings.

The backlog provider and the code host can differ (for example Azure Boards with the code on GitLab), so the code host gets its own `pr.*` keys instead of reusing `backlog.provider`. Accepted trade-offs: one more key to configure on projects where backlog and code share a host, and a linked worktree can apply main-worktree settings that its branch has not committed. `/to-pr` never uses `backlog.*` to choose the destination, `.to-backlog.json` support is not restored, and bare-reference resolution without a configured `backlog.provider` keeps its previous behavior.

## What Changes

- `sai/tools/project-settings.js` adds the `pr.provider`, `pr.repository`, `pr.organization`, and `pr.project` catalogue ids, with `pr.provider` validated against caller-supplied to-pr provider ids; adds a `readPr` reader, a `projectRoot` locator, an `overrides` helper, a `group` parameter on `notice` and `notices`, and the `--pr-providers` CLI argument. `get` returns `notices` when it read the main worktree's file.
- Settings location: `readSettings` reads `.sai/settings.jsonc` from the git top-level directory of the working directory; in a linked worktree with no file of its own it reads the main worktree's file (derived from `git rev-parse --git-common-dir`) and returns a notice; outside git it reads the working directory. `locate: false` keeps reading the given directory, which the project settings screen uses.
- `sai/tools/to-pr.js` `resolve` reads `pr.*` before the deprecated `.to-pr.json`, which it now reads from the resolved project root with a deprecation warning (ignored when a valid `pr.*` key is set). A configured `pr.provider` skips the unknown-host question. The result carries the settings warnings, a `Project setting pr.<field>: <value>` notice for each field taken from the settings, and an override notice when an explicit provider, repository, or repository address outranks a different `pr.*` value. `backlog.*` never chooses the destination.
- `sai/tools/from-backlog.js` resolves a bare `N` or `#N` in the configured `backlog.provider`: GitLab and GitHub against the single matching repository of the Git remotes, Azure DevOps against `backlog.organization` and `backlog.project` when both are set, otherwise against its existing context. No single matching remote returns `needs_input` with `context-ambiguous`; a configured provider that does not accept the reference returns `provider-destination-conflict`. A full URL that matches another provider positively keeps that provider and reports that the setting was overridden.
- `sai/tools/to-backlog.js`, `sai/tools/from-next-backlog-item.js`, and `sai/tools/from-backlog.js` prepend the main-worktree notice to their `notices`.
- The project settings screen lists `pr.provider` with choices from the to-pr registry; the writer validates `pr.provider` through the catalogue with the to-pr provider ids.
- Documentation: `docs/project-settings.md`, `docs/commands/to-pr.md`, `skills/universal/to-pr/SKILL.md`, and `skills/universal/from-backlog/SKILL.md` describe the new keys, precedence, and location.
- Tests cover root resolution, `pr.*`, the deprecated `.to-pr.json`, explicit overrides, and the `/from-backlog` bare-reference precedence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-resolution`: `/to-pr` resolves its destination from explicit input, then `pr.*` settings, then the deprecated `.to-pr.json`, then Git remotes, and a configured `pr.provider` settles a self-hosted host.
- `from-backlog-provider-resolution`: a configured `backlog.provider` decides bare `N` and `#N` references; a full URL keeps its positive match with an override notice.
- `project-settings`: the catalogue gains `pr.*`, the reader locates the settings file from the git top-level directory with a main-worktree fallback, and the CLI accepts `--pr-providers`.
- `project-settings-screen`: the screen lists `pr.provider`.
- `project-settings-writer`: the writer validates `pr.provider` against the to-pr provider ids.

## Impact

Modified files:

- `sai/tools/project-settings.js`
- `sai/tools/to-pr.js`
- `sai/tools/from-backlog.js`
- `sai/tools/from-next-backlog-item.js`
- `sai/tools/to-backlog.js`
- `bin/project-settings-screen.js`
- `bin/project-settings-writer.js`
- `docs/project-settings.md`
- `docs/commands/to-pr.md`
- `skills/universal/to-pr/SKILL.md`
- `skills/universal/from-backlog/SKILL.md`
- `test/project-settings.test.js`
- `test/project-settings-screen.test.js`
- `test/to-pr.test.js`

New files: none.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Observed evidence (2026-10-17, read-only runs in `onira-hub-front` with `backlog.provider: gitlab` and remote host `git.oniratec.com`): `to-pr.js resolve` returned `provider-ambiguous` with `unknownHosts: ["git.oniratec.com"]`; `from-backlog.js resolve` sent `8` to Azure DevOps (`az` not found) and rejected `#8` as `invalid-reference`; `to-backlog.js resolve` resolved `gitlab` correctly. Only the `#N` and `N` forms for GitLab and GitHub need the repository derived from the remote.
