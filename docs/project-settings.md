# Project settings

`.sai/settings.jsonc` in the project root holds committed, per-project answers to questions that commands otherwise ask each run. It is the same file for Claude Code and opencode. Edit it with the **Project settings** screen of `node bin/install setup`, or by hand.

The file is JSON with comments and trailing commas allowed. Setting ids are dotted key paths, so `backlog.provider` is the key `provider` inside the object `backlog`:

```jsonc
{
  "backlog": {
    // A self-hosted GitLab host does not identify its provider.
    "provider": "gitlab"
  }
}
```

## Catalogue

| Setting id | Value | Used by |
|------------|-------|---------|
| `backlog.provider` | A registered backlog provider id (`github`, `gitlab`, `azuredevops`) | `/to-backlog`, `/from-next-backlog-item`; `/from-backlog` for bare `N` and `#N` references and as a tie-breaker |
| `backlog.repository` | Repository address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.project` | Project, board, or team name or address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.organization` | Organization address | `/to-backlog`, `/from-next-backlog-item` |
| `pr.provider` | A registered `/to-pr` provider id (`github`, `gitlab`, `azuredevops`) | `/to-pr` |
| `pr.repository` | Repository address | `/to-pr` |
| `pr.organization` | Organization address | `/to-pr` |
| `pr.project` | Project name or address | `/to-pr` |
| `explore.readyToProposeLanguage` | A language name, preferably its endonym (`Español`), or `English` | `/sai-explore` crystallization language gate |
| `explore.overviewLanguage` | A language name, preferably its endonym, `English`, or `none` for no overview | `/sai-explore` overview-language question at Plan - Unattended activation |

Both `explore.*` ids accept any non-empty string as the language name; the endonym is recommended and never checked. `English`, `none`, and `ask` match case-insensitively, and the tool returns `English` and `None` in canonical form. In `explore.overviewLanguage`, `none` selects no overview. In `explore.readyToProposeLanguage`, `none` is invalid.

`explore.overviewLanguage` answers only the Plan - Unattended activation question. Direct Build, Manual, and standalone `/sai-2-design` ignore it. The artifact-review language question has no setting. The `**Overview language**` field of a `Ready to Propose` block shows only the `--overview-lang` value or `None`, whatever the settings hold.

The work-item type has no setting; it is chosen at each creation. Provider ids come from the provider registries, never from this page.

## Values and precedence

- A missing key, a missing file, or `"ask"` keeps the normal question.
- Precedence: an explicit override (an invocation flag, a direct statement in the conversation, or for `/from-backlog` the issue URL itself) beats a project setting, which beats a fast-track fixed value, which beats the normal question.
- When a setting answers a question, the command prints one line naming the setting id and its value.
- The explore language questions follow the same order. The crystallization language question takes the user's explicit statement, then `explore.readyToProposeLanguage`, then the fast-track value `English`, then the normal question. The overview-language question takes `--overview-lang` or the user's explicit statement, then a value already resolved for the same crystallized set, then `explore.overviewLanguage`, then the fast-track value `None`, then the normal question. Both read the setting only; an answer to the normal question stays in the conversation.
- Settings answer preferences only. Authorization gates (commit authorization, publication confirmation, safe-operations confirmations, route selection) always ask.

`/from-backlog` resolves a bare `N` or `#N` in `backlog.provider`: GitLab and GitHub against the repository of the Git remotes, Azure DevOps against `backlog.organization` and `backlog.project` when both are set, otherwise against its existing context. Without the setting a bare reference keeps its current resolution. A full URL that matches a provider positively keeps that provider, and the command prints a line saying that the setting was overridden. Among providers that accept a URL only as a fallback, the setting breaks the tie. When the setting names a provider that does not accept the reference, the command stops with `provider-destination-conflict`.

`/to-pr` takes its code host from the `pr.*` keys, never from `backlog.*`: the backlog provider and the code host can differ (for example Azure Boards with the code on GitLab). The order is an explicit provider or repository, then `pr.*`, then `.to-pr.json`, then Git remotes. An explicit value that differs from a `pr.*` key wins, and the command prints a line saying so. With `pr.provider` set, a self-hosted host needs no provider question. `.to-pr.json` is deprecated: it works only when no valid `pr.*` key is set, with a warning, and `.to-backlog.json` is no longer read.

## Location

Every reader looks for `.sai/settings.jsonc` in the git top-level directory of the working directory, so a subdirectory works. In a linked worktree that has no file of its own, the readers use the main worktree's file and print a notice, because `.sai/` is often untracked; a worktree's own file wins. Outside a git repository only the working directory is read.

## Invalid input

- A file that cannot be parsed produces one warning naming the file and the parse error; every setting asks its normal question.
- An unknown setting id is ignored with a warning.
- A value outside its allowed set invalidates only that key, with a warning; the other keys still apply.
- A gate that cannot read a setting (an unreadable file, an invalid value, or an unavailable tool) treats it as absent, prints the warnings or one line naming the failure, and continues at the next level.

## Project settings screen

Run `node bin/install setup` and choose **Project settings** in the post-setup menu. The screen lists four settings with their current values:

- `explore.readyToProposeLanguage`: `ask`, `English`, or a language name you type.
- `explore.overviewLanguage`: `ask`, `English`, `none`, or a language name you type.
- `backlog.provider`: `ask` or a provider id from the provider registries.
- `pr.provider`: `ask` or a provider id from the `/to-pr` registry.

`backlog.repository`, `backlog.project`, `backlog.organization`, and the other `pr.*` keys stay hand-edited. A typed language name is checked like the reader checks it, and an entry that is not accepted is asked again. The screen writes the canonical form (`English`, `None`).

Choosing `ask` writes the string `"ask"`, which keeps the normal question and keeps the key's comment in the file. A stored value outside its allowed set shows with the reader's warning, and you may replace it.

Leaving the screen saves when at least one value changed. The file is edited in place: comments, other keys, and every byte outside the edited values stay as they were. The first save creates `.sai/settings.jsonc`. A session without a change touches nothing. Cancelling the menu with Ctrl-C discards the edits. A file that cannot be parsed is reported when the screen opens and is never rewritten; the same holds for a write error, which is reported and leaves the file as it was. Without a TTY the screen is skipped with the rest of the post-setup menu.

## Reader

`sai/tools/project-settings.js` reads and validates the file and writes nothing. It has no dependencies. The screen writes through `bin/project-settings-writer.js`, which validates each value through the reader's catalogue.

```sh
node sai/tools/project-settings.js get backlog.provider --json --cwd <project-root>
```

It prints `{value, source, warnings}`, where `source` is `setting` or `absent`, plus `notices` when it read the main worktree's file.
