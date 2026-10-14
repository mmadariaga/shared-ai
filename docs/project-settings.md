# Project settings

`.sai/settings.jsonc` in the project root holds committed, per-project answers to questions that commands otherwise ask each run. It is the same file for Claude Code and opencode. Edit it by hand; no command writes it yet.

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
| `backlog.provider` | A registered backlog provider id (`github`, `gitlab`, `azuredevops`) | `/to-backlog`, `/from-next-backlog-item`; `/from-backlog` as a tie-breaker |
| `backlog.repository` | Repository address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.project` | Project, board, or team name or address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.organization` | Organization address | `/to-backlog`, `/from-next-backlog-item` |

The work-item type has no setting; it is chosen at each creation. Provider ids come from the provider registries, never from this page.

## Values and precedence

- A missing key, a missing file, or `"ask"` keeps the normal question.
- Precedence: an explicit override (an invocation flag, a direct statement in the conversation, or for `/from-backlog` the issue URL itself) beats a project setting, which beats a fast-track fixed value, which beats the normal question.
- When a setting answers a question, the command prints one line naming the setting id and its value.
- Settings answer preferences only. Authorization gates (commit authorization, publication confirmation, safe-operations confirmations, route selection) always ask.

`/from-backlog` uses `backlog.provider` only among providers that accept the URL as a fallback. A URL that matches a provider positively keeps that provider. When the setting names a provider that does not accept the URL, the command stops with `provider-destination-conflict`.

## Invalid input

- A file that cannot be parsed produces one warning naming the file and the parse error; every setting asks its normal question.
- An unknown setting id is ignored with a warning.
- A value outside its allowed set invalidates only that key, with a warning; the other keys still apply.

## Moving from `.to-backlog.json`

For one version, a project that has only `.to-backlog.json` keeps working: its fields are read as `backlog.*` with a deprecation warning and the same validation. A `type` key now produces an unknown-setting warning. When `.sai/settings.jsonc` exists, even unreadable, it wins and a warning says `.to-backlog.json` is ignored. To migrate, move the fields under `backlog` in `.sai/settings.jsonc` and delete `.to-backlog.json`.

## Reader

`sai/tools/project-settings.js` reads and validates the file and writes nothing. It has no dependencies.

```sh
node sai/tools/project-settings.js get backlog.provider --json --cwd <project-root>
```

It prints `{value, source, warnings}`, where `source` is `setting`, `legacy`, or `absent`.
