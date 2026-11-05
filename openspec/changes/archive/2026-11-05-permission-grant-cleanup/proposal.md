> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Restricted capability profiles kept denying commands that their own instructions prescribe. The opencode budget-explorer denied `git grep ... | head` (see ADR 0207), and an inventory of `sai/install-manifest.json` found grants that were missing or too narrow in several commands: profiles without the `fetch` skill, no grant for the `opencode debug paths` tool-location fallback, exact rules that rejected arguments, and no quoted absolute form of a `node` rule when the installer passed no install root. The read-only guarantees of the research and read-only command profiles stay worth keeping, so the fix widens shell access only where a command already mutates and makes the read-only pattern lists complete instead.

## What Changes

- `sai/install-manifest.json`:
  - `worktree-command`, `new-change-branch-command`, `to-pr-command`, and `to-backlog-command` grant shell `*`; their skills lists and confirmation contracts are unchanged apart from `fetch`.
  - Every profile that declares an explicit `skills` list now includes `fetch` (audit, implement, commit, archive, backfill, merge, to-backlog, from-backlog, from-next-backlog-item, to-pr, new-change-branch, context-cache-benchmark, and cache-warmer command profiles).
  - `capabilities.universal.shell` adds `opencode debug paths`, so every profile may run the last-resort opencode tool-location step.
  - `from-next-backlog-item-command` keeps `node {sai}/tools/from-next-backlog-item.js select` and adds `node {sai}/tools/from-next-backlog-item.js select *`; `explore-command` keeps `node {skills}/to-backlog/scripts/prepare-temp.js {harness}` and adds the same rule followed by ` *`.
  - `commit-command` keeps `write: false`, every delegate allowlist is unchanged, and the research, explore, status, retrospective, from-backlog, from-next-backlog-item, cache-warmer, and context-cache-benchmark profiles keep pattern-list shell.
- `bin/capabilities.js`:
  - Every `{sai}` or `{skills}` shell pattern is always emitted in the project-local, `~`, and quoted absolute forms. When the caller passes no install root, the translator resolves it: `~/.claude` for Claude Code; for opencode, the `config` directory that `opencode debug paths` reports, else `$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`. The default is resolved once per process and XDG setting, and only when a pattern needs a root.
  - The skill-only `new-change-branch` workflow is projected with its compiled grants: the Claude Code `SKILL.md` receives them in its `allowed-tools` frontmatter, and the opencode copy drops the placeholder line because opencode takes its rules from the primary agent.
- `skills/universal/new-change-branch/SKILL.md` gains the `allowed-tools: {{capabilityAllowedTools}}` frontmatter placeholder.
- `sai/policies/explore-agent.md` § Shell restriction: the budget-explorer runs one allowed command per shell call from the project root, with no pipe, chaining, redirection, or command substitution, limits output with the command's own options (`git grep -l`, `git grep -c`, `git grep --max-count <n>`, or a narrower pathspec) instead of a trailing `| head`, and records `shell operation refused: <description>` for any other command or command form.
- Tests: a new table-driven `test/read-only-shell-grants.test.js` asserts, for each read-only profile on both harnesses, that every prescribed shell command is allowed in its relative, `~`, and quoted-absolute forms, that the four mutating utility profiles grant `*`, that every explicit skills list includes `fetch`, and that the universal list includes `opencode debug paths`. Existing tests are updated for the new grants, the always-emitted absolute form, the XDG override, the projected new-change-branch skill, and the explorer policy text.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `contract-tool-capabilities`: wildcard shell for the four mutating utility command profiles; `fetch` in every explicit skills list; `opencode debug paths` in the universal shell list; argument-tolerant selector and preparation rules; the quoted absolute form of every `node` rule with an internally resolved install root; read-only grant coverage tests; compiled grants in the frontmatter of the commandless new-change-branch skill.
- `opencode-explore-read-only`: the budget-explorer shell grant includes the universal `opencode debug paths` rule.
- `tool-preference-ladder`: the budget-explorer runs one allowed shell command per call and limits output with the command's own options.

## Impact

New files:
- `test/read-only-shell-grants.test.js`

Modified files:
- `bin/capabilities.js`
- `sai/install-manifest.json`
- `sai/policies/explore-agent.md`
- `skills/universal/new-change-branch/SKILL.md`
- `test/absolute-home-shell-permissions.test.js`
- `test/archive-backfill-goal-driven.test.js`
- `test/audit-coordinator.test.js`
- `test/backlog-gitlab.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/explore-agent-tools.test.js`
- `test/from-next-backlog-item.test.js`
- `test/new-change-branch.test.js`
- `test/to-backlog-prepare-temp.test.js`
- `test/to-backlog-update.test.js`
- `test/to-backlog.test.js`
- `test/to-pr.test.js`

The four widened commands run any shell command without a prompt inside their invocation. Read-only profiles keep pattern lists, so each new prescribed command needs a matching grant and test row.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Unverified during exploration: whether opencode also denies the pipe forms that wildcard-shell coordinators use; slice 2 removes that dependency. The disposable POC worktree `../shared-ai.poc-shell-matcher` (branch `poc/shell-matcher`) holds the raw matcher evidence in `poc/shell-matcher/RESULTS.md` until the user removes it.
