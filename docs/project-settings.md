# Project settings

`.sai/settings.jsonc` in the project root holds committed, per-project answers to questions that commands otherwise ask each run. It is the same file for Claude Code and opencode. Edit it with the **Project behavior settings** screen and the **Cache warming** section of `npx github:mmadariaga/shared-ai setup`, or by hand. A personal `.sai/settings.local.jsonc`, which you create by hand, overrides it key by key; see [Local overrides](#local-overrides).

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
| `warming` | An object with `defaults` and `rules`; see [Cache warming](#cache-warming) | Every SAI agent that keeps its prompt cache warm (`sai/policies/cache-warming.md`) |

All three `explore.*` ids accept any non-empty string as the language name; the endonym is recommended and never checked. `English`, `none`, and `ask` match case-insensitively, and the tool returns `English` and `None` in canonical form. In `explore.overviewLanguage`, `none` selects no overview. In `explore.readyToProposeLanguage` and `explore.chatPublicLanguage`, `none` is invalid.

`explore.overviewLanguage` answers only the overview question that the route round asks beside the route choice, and it takes effect only when the route is Plan - Unattended. Direct Build, Manual, and standalone `/sai-2-design` ignore it. The artifact-review language question has no setting. The `**Overview language**` field of a `Ready to Propose` block shows only the `--overview-lang` value or `None`, whatever the settings hold.

`explore.chatPublicLanguage` is the language that `/sai-explore` uses with you. It is the same as writing "let's talk in <language>" right after the command loads, before any idea or change is discussed. It always wins over the language you write in, so the chat stays in that language until you ask for another one; without the setting, `/sai-explore` follows the language you write in. Only explanatory chat text changes: reasoning stays English, fixed literals such as STOP notices, halt messages, and picker labels stay as written, and the `Ready to Propose` block, the change overview, and every artifact keep the languages that their own settings and gates choose.

The work-item type has no setting; it is chosen at each creation. Provider ids come from the provider registries, never from this page.

## Cache warming

The `warming` setting lets SAI agents keep their prompt cache warm between continuations. An agent arms one background wait after each response and re-arms on each wake until its `max` window passes since its last real task or continuation, or until the agent that dispatched it disposes it. Without the setting, nothing warms. Each wake costs two short requests and some usage allowance, which the `max` window bounds; a pause longer than `max` still resumes cold.

`interval` and `max` are numbers of minutes, and `max` is at least `interval`. The value is one object under the single id `warming`:

```jsonc
{
  "warming": {
    // One entry per role: `agent` is a main session that runs a command, `subagent` is a worker or helper.
    "defaults": {
      "agent": { "interval": 4, "max": 30 },
      "subagent": false
    },
    // Rules are keyed by provider, an optional model, and a role. Model ids are values, never keys.
    "rules": [
      { "provider": "anthropic", "model": "haiku", "role": "subagent", "interval": 4, "max": 20 },
      { "provider": "opencode-go", "role": "subagent", "enabled": false }
    ]
  }
}
```

- A `defaults` entry is `{ "interval", "max" }` or `false`. A rule carries `provider`, an optional `model`, `role`, and either `interval` and `max` or `"enabled": false`.
- Resolution runs separately for each role: the first rule that matches the provider, the model, and the role; then, for the provider `anthropic`, the first rule whose model is the model family of the runtime id; then the first rule that matches the provider and the role and has no `model`; then `defaults` for the role. When none applies, or the winning entry is `false`, the agent does not warm.
- The model family is the version-less alias of a Claude model: the runtime id `claude-opus-5-5` belongs to the family `opus`, so a rule for `opus` applies to it when no rule names the full id. The tool derives the family from ids of the form `claude-<family>-...`; an id of another shape, or a provider other than `anthropic`, has no family and skips this step. A command on Claude Code declares an alias such as `opus`, while the running session reports the full id, which is why the family step exists.
- The provider and model of a worker or helper come from the `model` frontmatter of its installed agent file. On Claude Code the provider is `anthropic` and the model is the frontmatter value as written (for example `haiku`). On opencode the value is `<provider>/<model>`, so `opencode-go/deepseek-v4.1-flash` is the provider `opencode-go` and the model `deepseek-v4.1-flash`.
- Timings are resolved again for every arm, so a change in either settings file, a local override included, applies from the next arm without restarting any agent. The local file replaces the whole `warming` value, as it replaces any key.
- An invalid `warming` value is dropped with a warning, and nothing warms.

Print the effective values for one agent:

```sh
node sai/tools/project-settings.js warming --provider anthropic --model haiku --role subagent --json --cwd <project-root>
```

It prints `{warming, origin, warnings}`, where `warming` is `{interval, max}` or `off`, and `origin` is `model`, `family`, `provider`, `defaults`, or `none`.

### Cache warming section

Run `npx github:mmadariaga/shared-ai setup` and choose **Cache warming** in the post-setup menu. The [project behavior settings screen](#project-behavior-settings-screen) does not edit `warming`; this section does, and you can still edit the file by hand. It shows one default per role, then guided rules per role:

- **Role defaults**: `Default for agent` and `Default for subagent`. Each is `off` or `every <interval> min, up to <max> min`. A new project shows both as `off`, so nothing warms until you enable one.
- **Guided rules**: one row for each (provider, model) pair that an installed SAI file declares in its `model` frontmatter, with any effort or variant suffix (`#xhigh`) removed. The `agent` role lists the pairs of installed commands and utilities. The `subagent` role lists the pairs of installed workers and helpers. A file without a `model` key adds no row; provider rules and the defaults cover it. The section reads the files of both harnesses and writes nothing to them.
- **Existing rules** that match no installed pair, for example a hand-written rule or one for a full model id, are listed with the note `(no installed file uses it)`. You can edit or remove them, and a save never drops them.

Choose a row to **Enable** it, set it to **Off** (`false` for a default, `"enabled": false` for a rule), or, for a rule, **Remove rule**. **Enable** asks for the interval and the maximum in minutes. An empty answer keeps the pre-filled value, which is the current one or `4` and `30` when none exists. Values must be positive and `max` at least `interval`; the section asks again otherwise, so it never writes an invalid value.

Leaving with **Done** saves when at least one edit changed the value. The section writes only the `warming` key of `.sai/settings.jsonc` and keeps the other keys and comments. A session without an edit leaves the file byte-identical, and so does Ctrl-C, which discards the edits. A reinstall keeps the stored values and shows them again. When the stored `warming` value is invalid, the section prints the warning and starts from empty values; the first save replaces it. When `.sai/settings.local.jsonc` defines `warming`, the section warns that the local value replaces the one it writes, and it still writes only the base file.

The `/sai-context-cache-ttl-benchmark` command turns warming off in `.sai/settings.local.jsonc` while it measures and restores the file afterwards; see its [command page](commands/sai-context-cache-ttl-benchmark.md#warming-override).

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
