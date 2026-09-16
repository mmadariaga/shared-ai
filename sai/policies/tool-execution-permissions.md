# Tool Execution Permissions

Single source for execution permissions on `node` tool invocations. This file
authorizes the closed sets per role; each Claude Code wrapper implements its
role's set directly in `allowed-tools` (wrappers carry the entries, they do
not Fetch this file), to avoid drift across commands.

Copy selection stays first-existing-verbatim per
`@sai/policies/tool-resolution.md` (project-local relative path first, then
verbatim user-global root, opencode XDG fallback only when neither exists).
Never compose paths by joining root strings. Paths below are never joined;
take the first candidate that exists, copied verbatim, exactly as written.

## Closed sets per role (Claude Code `allowed-tools`)

### Explore (`commands/claude/sai-explore.md`)

Exactly three tools, each in both roots:

- `node .claude/sai/tools/prereqs.js` + `node ~/.claude/sai/tools/prereqs.js`
  (`check --json --cwd <project-root> --require-openspec-skills claude`)
- `node .claude/sai/tools/research-tools-check.js` + `node
  ~/.claude/sai/tools/research-tools-check.js` (`--json --cwd <project-root>`
  plus explicit `--mcp-present true|false`)
- `node .claude/sai/bin/sai-state.js` + `node ~/.claude/sai/bin/sai-state.js`
  (`<verb> ...`; verbs take neither `--json` nor `--cwd`)

No other `node` invocation is permitted on this wrapper.

### Worker coordinators (`sai-1-spec`, `sai-2-design`, `sai-3-implement`,
### `sai-5-review`, `sai-6-security`, `sai-7-performance`,
### `sai-8-accessibility`, `sai-build`, `sai-review`)

Exactly three `node` tools, each in both roots, plus one scoped remediation grant:

- `node .claude/sai/tools/worker-report-validator.js` + `node
  ~/.claude/sai/tools/worker-report-validator.js` (`validate --kind <kind>`
  with the payload on stdin)
- `node .claude/sai/tools/no-commit-guard.js` + `node
  ~/.claude/sai/tools/no-commit-guard.js` (`snapshot --json --cwd
  <project-root>` / `verify --base <guard_base> [--allow-commit] --json --cwd
  <project-root>`)
- `node .claude/sai/bin/sai-state.js` + `node ~/.claude/sai/bin/sai-state.js`
  (`<verb> ...`; verbs take neither `--json` nor `--cwd`)
- `Bash(git reset:*)` — the exact mixed `git reset <guard_base>` remediation
  only, never `--hard`, `--soft`, `--keep`, checkout, or branch operations,
  under the existing safe-operations carve-out.

No other `node` invocation is permitted on these wrappers. No wrapper gains
an unscoped `Bash` grant.

### Worktree (`commands/claude/sai-worktree.md`)

Exactly one `node` tool, in both roots, alongside the existing scoped
`Bash(git:*)`:

- `node .claude/sai/tools/worktree.js` + `node
  ~/.claude/sai/tools/worktree.js` (`<sub-command> [arguments] --json --cwd
  <invoking-directory>`)

No other `node` invocation is permitted on this wrapper.

### Status (`commands/claude/sai-status.md`)

Exactly two `node` tools, each in both roots, alongside the existing scoped
`Bash(openspec:*)`:

- `node .claude/sai/tools/change-picker.js` + `node
  ~/.claude/sai/tools/change-picker.js` (`resolve "<arguments_value>"
  --bulk-option --json --cwd <project-root>`)
- `node .claude/sai/tools/status.js` + `node ~/.claude/sai/tools/status.js`
  (`panel <change-name> --json --cwd <project-root>` / `bulk --json --cwd
  <project-root>`)

No other `node` invocation is permitted on this wrapper.

### Unchanged surface

`sai-4-apply`, `sai-commit`, `sai-archive`, `sai-backfill`, and `sai-merge`
keep their current execution surface unchanged (full `Bash` or unrestricted
where declared). No other wrapper gains a `node` entry beyond the closed sets
above.

## Failure semantics

An unresolvable tool or store/guard failure stops the phase naming the tried
candidates; validation is never skipped and step-machine store failure never
continues degraded. There is no prose fallback: a missing validator never
skips validation, and missing prereqs never continue as `verdict: pass`.

## Opencode

Opencode wrappers carry no permission field and gain none under this change.
Unattended routes never depend on an interactive permission prompt; a missing
tool stops naming the tried candidates, never a prose fallback. The Direct
Build consent model is unchanged: exactly one local commit, never push.

## Mirror discipline

Claude Code expresses this rule through `allowed-tools` frontmatter;
opencode expresses the same guarantee through its model-only mechanism (no
permission field). Both harnesses preserve the same closed tool sets,
failure semantics, and unattended no-prompt guarantee.

## Evolution

A future tool requires a policy update to the closed set above; a closed
auditable set beats silent per-wrapper drift.
