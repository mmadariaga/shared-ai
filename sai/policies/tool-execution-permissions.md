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

Exactly two tools, each in both roots:

- `node .claude/sai/tools/prereqs.js` + `node ~/.claude/sai/tools/prereqs.js`
  (`check --json --cwd <project-root> --require-openspec-skills claude`)
- `node .claude/sai/bin/sai-state.js` + `node ~/.claude/sai/bin/sai-state.js`
  (`<verb> ...`; verbs take neither `--json` nor `--cwd`; `emit` takes the
  event JSON on stdin: `echo '<json>' | node <tool-path> emit <id> <machineId> -`)

No other `node` invocation is permitted on this wrapper.

### Worker coordinators (`sai-1-spec`, `sai-2-design`, `sai-3-implement`,
### `sai-5-review`, `sai-6-security`, `sai-7-performance`,
### `sai-8-accessibility`, `sai-review`)

Exactly three `node` tools, each in both roots, plus one scoped remediation grant:

- `node .claude/sai/tools/worker-report-validator.js` + `node
  ~/.claude/sai/tools/worker-report-validator.js` (`validate --kind <kind>`
  with the payload on stdin)
- `node .claude/sai/tools/no-commit-guard.js` + `node
  ~/.claude/sai/tools/no-commit-guard.js` (`snapshot --json --cwd
  <project-root>` / `verify --base <guard_base> [--allow-commit] --json --cwd
  <project-root>`)
- `node .claude/sai/bin/sai-state.js` + `node ~/.claude/sai/bin/sai-state.js`
  (`<verb> ...`; verbs take neither `--json` nor `--cwd`; `emit` takes the
  event JSON on stdin: `echo '<json>' | node <tool-path> emit <id> <machineId> -`)
- `Bash(git reset:*)` — the exact mixed `git reset <guard_base>` remediation
  only, never `--hard`, `--soft`, `--keep`, checkout, or branch operations,
  under the existing safe-operations carve-out.

`sai-5-review` and `sai-review` additionally carry `Bash(git diff:*)`,
`Bash(git add:*)`, and `Bash(git commit:*)` for their Direct Build close
(`sai/commands/meta-review/direct-build-close.md`): the fix-loop diff read, the
path-scoped stage, and the one pre-authorized local commit. The selector is the
consent; the grants only spare a second permission prompt.

No other `node` invocation is permitted on these wrappers. None of the
wrappers in this section gains an unscoped `Bash` grant.

### Worktree (`commands/claude/sai-worktree.md`)

Exactly one `node` tool, in both roots, alongside the existing scoped
`Bash(git:*)`:

- `node .claude/sai/tools/worktree.js` + `node
  ~/.claude/sai/tools/worktree.js` (`<sub-command> [arguments] --json --cwd
  <invoking-directory>`)

No other `node` invocation is permitted on this wrapper.

### Status (`commands/claude/sai-status.md`)

Exactly three `node` tools, each in both roots, alongside the existing scoped
`Bash(openspec:*)`:

- `node .claude/sai/tools/prereqs.js` + `node ~/.claude/sai/tools/prereqs.js`
  (`check --json --cwd <project-root> --require-openspec-skills claude`)
- `node .claude/sai/tools/change-picker.js` + `node
  ~/.claude/sai/tools/change-picker.js` (`resolve "<arguments_value>"
  --bulk-option --json --cwd <project-root>`)
- `node .claude/sai/tools/status.js` + `node ~/.claude/sai/tools/status.js`
  (`panel <change-name> --json --cwd <project-root>` / `bulk --json --cwd
  <project-root>`)

No other `node` invocation is permitted on this wrapper.

### Unchanged surface

`sai-4-apply`, `sai-build`, `sai-commit`, `sai-archive`, `sai-backfill`, and
`sai-merge` keep their current execution surface unchanged (full `Bash` or
unrestricted where declared). `sai-4-apply` and `sai-build` declare an
unscoped `Bash` in `allowed-tools`; `sai-commit`, `sai-archive`,
`sai-backfill`, and `sai-merge` declare no `allowed-tools` key at all.
`sai-retire-docs` also keeps an unscoped `Bash` in its `allowed-tools`, and
`sai-pr` declares no `allowed-tools` key. No other wrapper gains a `node`
entry beyond the closed sets above.

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
