> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On a self-hosted GitLab, the remote host does not identify the backlog provider, so remote-based destination resolution in `to-backlog` returned `provider-ambiguous` and asked every run. The only stored configuration, `.to-backlog.json`, served `to-backlog` alone, rejected a `type` key with a hard error, and nothing created it. Projects needed one committed place to state their backlog provider and destination that every backlog tool reads the same way.

## What Changes

- New `sai/tools/project-settings.js`: a dependency-free, read-only CommonJS module and CLI. It reads `.sai/settings.jsonc` in the project root and is the single catalogue of setting ids (`backlog.provider`, `backlog.repository`, `backlog.project`, `backlog.organization`) and their validation. It parses JSONC with a string-aware scanner (line and block comments, trailing commas, comment markers inside strings kept). `"ask"`, a missing key, or a missing file leaves the question normal. An unknown id is ignored with a warning; an invalid value drops only that key with a warning; an unparseable or unreadable file produces one warning and no values. `backlog.provider` is validated against provider ids supplied by the caller. The CLI `get <id> [--json] [--cwd <root>] [--providers <id,id>]` prints `{value, source, warnings}`, with `source` `setting`, `legacy`, or `absent`. It also exports `readBacklog`, `notices`, `notice`, and `report` helpers.
- `.to-backlog.json` transition: when only the legacy file exists, its fields are read as `backlog.*` with a deprecation warning and `source: legacy`, under the same validation; a `type` key now yields an unknown-setting warning instead of an error. When `.sai/settings.jsonc` exists, readable or not, it wins and a warning says `.to-backlog.json` is ignored.
- `sai/tools/to-backlog.js`: `resolve` reads the `backlog.*` settings instead of `.to-backlog.json` and passes them as the existing `config` input, so explicit fields still win. The output carries settings `warnings` and one `Project setting backlog.<field>: <value>` notice for each field the resolved destination took from the settings. Warnings are kept on `failure_before_publication` output.
- `sai/tools/from-next-backlog-item.js`: destination resolution passes the same settings config into the `to-backlog` resolver, filters Git remotes by the configured provider when no explicit provider is given, and returns warnings and notices on every result, including pending and failed selections.
- `sai/tools/from-backlog.js`: the configured `backlog.provider`, validated against the read-capable provider ids, is applied only when no provider matched the reference positively. It selects one of several fallback candidates, keeps a single fallback candidate it names, and returns `provider-destination-conflict` when it names no fallback candidate. Output carries settings warnings and, when the setting broke a tie, a notice.
- Skill prose: `skills/universal/to-backlog/create.md` names the settings in the destination order (explicit input, then settings, then Git remotes). `skills/universal/from-next-backlog-item/SKILL.md` lets the helper read stored `backlog.*` settings as destination defaults while the skill never writes them. `skills/universal/from-backlog/SKILL.md` describes the tie-breaker. All three print the tool's `warnings` and `notices` verbatim.
- Documentation: new `docs/project-settings.md` (file location, catalogue, values, precedence, invalid input, transition, reader CLI); `docs/backlog.md` and `docs/commands/to-backlog.md` link it instead of describing `.to-backlog.json`.
- Tests: `test/project-settings.test.js` covers JSONC parsing, missing file/key and `"ask"`, invalid ids and values, unparseable files, the three `source` values, the legacy transition (including an unreadable settings file), notices, the CLI, `to-backlog` resolution of an unknown host through the configured provider, warnings on failed resolutions and selections, and the `from-backlog` fallback matrix with an injected registry that holds two fallback providers.

## Capabilities

### New Capabilities

- `project-settings`: read-only reader of `.sai/settings.jsonc` with the setting id catalogue, JSONC parsing, validation, the `.to-backlog.json` transition, the `get` CLI, and the warnings and notices that backlog tools report.

### Modified Capabilities

- `to-backlog-provider-resolution`: destination configuration comes from the `backlog.*` project settings instead of `.to-backlog.json`.
- `from-backlog-provider-resolution`: a configured `backlog.provider` breaks ties among fallback candidates only, and a mismatch is a `provider-destination-conflict`.
- `from-next-backlog-item`: the `backlog.*` settings fill destination fields that no explicit input supplies, before Git remotes.

## Impact

- New: `sai/tools/project-settings.js`
- New: `docs/project-settings.md`
- New: `test/project-settings.test.js`
- Modified: `sai/tools/to-backlog.js`
- Modified: `sai/tools/from-next-backlog-item.js`
- Modified: `sai/tools/from-backlog.js`
- Modified: `skills/universal/to-backlog/create.md`
- Modified: `skills/universal/from-next-backlog-item/SKILL.md`
- Modified: `skills/universal/from-backlog/SKILL.md`
- Modified: `docs/backlog.md`
- Modified: `docs/commands/to-backlog.md`

No command writes `.sai/settings.jsonc`; users edit it by hand until a writer ships. A legacy `.to-backlog.json` with a `type` key now produces a warning instead of a hard error.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Related follow-up work under parent https://github.com/mmadariaga/shared-ai/issues/108: `project-settings-explore` (https://github.com/mmadariaga/shared-ai/issues/110) and `project-settings-setup` (https://github.com/mmadariaga/shared-ai/issues/111) both depend on this change. `project-settings-setup` now owns the settings writer and the choice between a dependency-free writer and `jsonc-parser` under `bin/` (already used in `bin/install-flow.js:1510-1536`). `project-settings-explore` conflicts with the accepted DDR 0123c (`docs/ddr/0123c-invocation-scoped-overview-language-selection.md`), which states the overview language is never persisted; that slice needs a superseding decision record or a narrower scope before it starts.
