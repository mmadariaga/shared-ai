# Project settings

`.sai/settings.jsonc` in the project root holds committed, per-project answers to questions that commands otherwise ask each run. It is the same file for Claude Code and opencode. Edit it with the **Project behavior settings** screen of `npx github:mmadariaga/shared-ai setup`, or by hand. A personal `.sai/settings.local.jsonc`, which you create by hand, overrides it key by key; see [Local overrides](#local-overrides).

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
| `explore.overviewLanguage` | A language name, preferably its endonym, `English`, or `none` for no overview | `/sai-explore` overview-language question in round 3 of the route round (applied only for Plan - Unattended) |
| `explore.chatPublicLanguage` | A language name, preferably its endonym, or `English` | `/sai-explore` chat language, from the first message after the load |

All three `explore.*` ids accept any non-empty string as the language name; the endonym is recommended and never checked. `English`, `none`, and `ask` match case-insensitively, and the tool returns `English` and `None` in canonical form. In `explore.overviewLanguage`, `none` selects no overview. In `explore.readyToProposeLanguage` and `explore.chatPublicLanguage`, `none` is invalid.

`explore.overviewLanguage` answers only the overview question that the route round asks beside the route choice, and it takes effect only when the route is Plan - Unattended. Direct Build, Manual, and standalone `/sai-2-design` ignore it. The artifact-review language question has no setting. The `**Overview language**` field of a `Ready to Propose` block shows only the `--overview-lang` value or `None`, whatever the settings hold.

`explore.chatPublicLanguage` is the language that `/sai-explore` uses with you. It is the same as writing "let's talk in <language>" right after the command loads, before any idea or change is discussed. It always wins over the language you write in, so the chat stays in that language until you ask for another one; without the setting, `/sai-explore` follows the language you write in. Only explanatory chat text changes: reasoning stays English, fixed literals such as STOP notices, halt messages, and picker labels stay as written, and the `Ready to Propose` block, the change overview, and every artifact keep the languages that their own settings and gates choose.

The work-item type has no setting; it is chosen at each creation. Provider ids come from the provider registries, never from this page.

## Values and precedence

- A missing key, a missing file, or `"ask"` keeps the normal question.
- Precedence: an explicit override (an invocation flag, a direct statement in the conversation, or for `/from-backlog` the issue URL itself) beats a project setting, which beats a fast-track fixed value, which beats the normal question.
- When a setting answers a question, the command prints one line naming the setting id and its value.
- The explore language questions follow the same order. The crystallization language question takes the user's explicit statement, then `explore.readyToProposeLanguage`, then the normal question. The overview-language question takes `--overview-lang` or the user's explicit statement, then a value already resolved for the same crystallized set, then `explore.overviewLanguage`, then the normal question. Both read the setting only; an answer to the normal question stays in the conversation.
- Settings answer preferences only. Authorization gates (commit authorization, publication confirmation, safe-operations confirmations, route selection) always ask.

`/from-backlog` resolves a bare `N` or `#N` in `backlog.provider`: GitLab and GitHub against the repository of the Git remotes, Azure DevOps against `backlog.organization` and `backlog.project` when both are set, otherwise against its existing context. Without the setting a bare reference keeps its current resolution. A full URL that matches a provider positively keeps that provider, and the command prints a line saying that the setting was overridden. Among providers that accept a URL only as a fallback, the setting breaks the tie. When the setting names a provider that does not accept the reference, the command stops with `provider-destination-conflict`.

`/to-pr` takes its code host from the `pr.*` keys, never from `backlog.*`: the backlog provider and the code host can differ (for example Azure Boards with the code on GitLab). The order is an explicit provider or repository, then `pr.*`, then `.to-pr.json`, then Git remotes. An explicit value that differs from a `pr.*` key wins, and the command prints a line saying so. With `pr.provider` set, a self-hosted host needs no provider question. `.to-pr.json` is deprecated: it works only when no valid `pr.*` key is set, with a warning, and `.to-backlog.json` is no longer read.

## Location

Every reader looks for `.sai/settings.jsonc` in the git top-level directory of the working directory, so a subdirectory works. In a linked worktree that has no file of its own, the readers use the main worktree's file and print a notice, because `.sai/` is often untracked; a worktree's own file wins. Outside a git repository only the working directory is read.

## Local overrides

`.sai/settings.local.jsonc` holds your personal values. The installer and the screen never create it and never edit any `.gitignore`; create the file by hand, and add it to your own `.gitignore` so that it is not committed.

- The file has the same format and the same ids as `.sai/settings.jsonc`.
- Readers merge the two files key by key: a key in the local file replaces the base value, even when its value equals the base value, and every other key keeps the base value. `"ask"` or an invalid value in the local file also replaces the base value and leaves the question normal.
- The local file is looked up in the same `.sai/` directory that supplies the base file, under the worktree rule above. With no base file, it is looked up in `.sai/` at the project root.
- An unknown id or an invalid value in the local file is handled as in the base file, with the warning naming `.sai/settings.local.jsonc`. A local file that cannot be parsed contributes nothing: its warning says that the local overrides are ignored and the base values apply, while an unparseable base file keeps its own warning that every setting asks its normal question.
- Every reader gets the merged value: the `get` command, the explore language gates, `/to-backlog`, `/from-backlog`, and `/to-pr`.

## Invalid input

- A file that cannot be parsed produces one warning naming the file and the parse error; every setting asks its normal question.
- An unknown setting id is ignored with a warning.
- A value outside its allowed set invalidates only that key, with a warning; the other keys still apply.
- A gate that cannot read a setting (an unreadable file, an invalid value, or an unavailable tool) treats it as absent, prints the warnings or one line naming the failure, and continues at the next level.

## Project behavior settings screen

Run `npx github:mmadariaga/shared-ai setup` and choose **Project behavior settings** in the post-setup menu. The screen lists five settings by label under the headers `Explore`, `Backlog`, and `Pull requests`, with their current values. A header is a text row that the cursor skips; it cannot be chosen.

- **Ready to Propose language** (`explore.readyToProposeLanguage`): `ask`, `English`, or a language name you type.
- **Change overview language** (`explore.overviewLanguage`): `ask`, `English`, `none`, or a language name you type.
- **Chat language** (`explore.chatPublicLanguage`): `follow my language`, `English`, or a language name you type. `follow my language` removes the key from the file that holds it.
- **Provider** under `Backlog` (`backlog.provider`): `ask` or a provider id from the provider registries.
- **Provider** under `Pull requests` (`pr.provider`): `ask` or a provider id from the `/to-pr` registry.

`backlog.repository`, `backlog.project`, `backlog.organization`, and the other `pr.*` keys stay hand-edited. A typed language name is checked like the reader checks it, and an entry that is not accepted is asked again. The screen writes the canonical form (`English`, `None`).

Choosing `ask` writes the string `"ask"`, which keeps the normal question and keeps the key's comment in the file. A stored value outside its allowed set shows with the reader's warning, and you may replace it.

A key that `.sai/settings.local.jsonc` holds shows as an override: the base value struck through, then the local value, then the marker `(local)`. Without a TTY, or with `NO_COLOR` set, the strikethrough is dropped and the row reads `base -> local (local)`. The screen saves a key that the local file holds to the local file and leaves the base file unchanged. It saves every other key to the base file. It never creates the local file. Choosing `follow my language` for a key in the local file removes it there, so the base value applies again.

Leaving the screen saves when at least one value changed. The files are edited in place: comments, other keys, and every byte outside the edited values stay as they were. The first save creates `.sai/settings.jsonc`. A session without a change touches nothing. Cancelling the menu with Ctrl-C discards the edits. A file that cannot be parsed, the local file included, is reported when the screen opens and is never rewritten; the same holds for a write error, which is reported and leaves the file as it was. Without a TTY the screen is skipped with the rest of the post-setup menu.

## Reader

`sai/tools/project-settings.js` reads and validates both files and writes nothing. It has no dependencies. The screen writes through `bin/project-settings-writer.js`, which validates each value through the reader's catalogue and picks the target file per key.

```sh
node sai/tools/project-settings.js get backlog.provider --json --cwd <project-root>
```

It prints `{value, source, warnings}`, where `value` is the merged value, `source` is `setting` or `absent`, plus `notices` when it read the main worktree's file.
