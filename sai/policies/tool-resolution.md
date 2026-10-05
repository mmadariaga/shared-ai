# Tool Resolution

Single source for tool-location resolution. Every command that runs
`sai/tools/*.js` or `bin/sai-state.js` fetches this file and SHALL NOT
restate the order inline — commands only reference it with a filename
substitution, to avoid drift between copies.

Use the copy that lives beside the referencing policy file: a copy under a
different root is a different version. Do **not** build its path by joining a
root string to a suffix — composed absolute paths are known to drop a segment
(see the "Path composition" rule in the fetch skill). Take the **first
candidate below that exists**, copied **verbatim**, exactly as written.

## `sai/tools/*.js` copies

Substitute the concrete file name (for example `prereqs.js`,
`change-picker.js`, `commit.js`, `check-delta-headers.js`,
`worker-report-validator.js`, `to-pr.js`, `file-manifest.js`, `apply-step.js`) for `<name>` below.

On **Claude Code**, in this order:

1. `.claude/sai/tools/<name>` — the project-local root, relative to the working directory.
2. `~/.claude/sai/tools/<name>` — the user-global root.

On **opencode**, in this order:

1. `.opencode/sai/tools/<name>` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/tools/<name>` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths`, take the config directory **exactly as that command prints it** (an XDG override moves it), and use the fixed suffix `sai/tools/<name>` inside it. This is the one place a path is joined at all, and only to a path the harness itself printed.

## `bin/sai-state.js` copy

On **Claude Code**, in this order:

1. `.claude/sai/bin/sai-state.js` — the project-local root, relative to the working directory.
2. `~/.claude/sai/bin/sai-state.js` — the user-global root.

On **opencode**, in this order:

1. `.opencode/sai/bin/sai-state.js` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/bin/sai-state.js` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths`, take the config directory **exactly as that command prints it** (an XDG override moves it), and use the fixed suffix `sai/bin/sai-state.js` inside it. This is the one place a path is joined at all, and only to a path the harness itself printed.

## Invocation

Whichever candidate wins, the invocation is byte-identical within one harness,
so a single whitelist entry per root covers that harness's form. Keep each
tool's own accepted flag set; do not change invocation semantics beyond path
resolution. `<name>` below is the filename placeholder from the candidate
lists; `<change-name>` is the separate CLI positional argument where a tool
takes one — never substitute one for the other.

- `commit.js`: `node <tool-path> <subcommand> --json --cwd <project-root>`
  plus the sub-command's required flags.
- `to-pr.js`, `to-backlog.js`, `from-backlog.js`: the owning universal skill
  defines the invocation.
- `file-manifest.js`: `node <tool-path> <fold|verify> <change-name> --json
  --cwd <project-root>`.
- `apply-step.js`: `node <tool-path> <verify|close> --change <change-name>
  --step <N> --cwd <project-root>` plus the sub-command's own flags (`verify`
  takes `--dispatch red|green|green-direct|green-exception` and the add-list on
  stdin; `close` takes `--guard-base <sha|n/a>`, optional `--dry-run`, and the
  add-list, a `---` line, then the commit message on stdin via a quoted
  heredoc; `close --mark-only` takes only `--change` and `--step`). It always
  prints one JSON object; `--json` is accepted and changes nothing.
- `check-delta-headers.js`: `node <tool-path> <change-name> [--json]
  [--root <dir>] [--delta-dir <dir>] [--specs-dir <dir>]`; it takes no
  `--cwd`.
- `worker-report-validator.js`: `node <tool-path> validate --kind <kind>`
  with the payload on stdin (plus `--json --cwd` where the tool accepts
  them).
- `ready-to-propose.js`: `node <tool-path> check --profile loose|strict`
  with the text on stdin. It always prints one JSON verdict; `--json` is
  accepted and changes nothing, and it takes no `--cwd`.
- `tool-access.js`: `node <tool-path> <verify|notices>` with JSON on stdin;
  `verify` takes `{required, evidence}`, `notices` takes `{ladder_discards}`.
  It prints JSON and takes neither `--json` nor `--cwd`.
- `bin/sai-state.js` verbs (`spawn`, `emit`, `reset`, `close`): `node
  <tool-path> <verb> ...` with the verb's own arguments; they take neither
  `--json` nor `--cwd`. The progress emit (`emit <id> <machineId> --progress
  [--with-overview true|false] -`, payload on stdin) loads the validator module
  itself, relative to the resolved `sai-state.js`, so it needs no separate
  `worker-report-validator.js` resolution and stays byte-identical whichever
  `sai-state.js` candidate wins.

If no candidate exists, say so — name the candidates you tried — and stop, unless the consuming instruction explicitly declares that its gate is optional when the tool is missing. That exception skips only the named gate; it never substitutes a prose check. A missing validator never
skips validation: resolve `worker-report-validator.js` on every Result Loop
turn that runs a separate `validate` call and stop the same way when
unresolvable. On a `step_machine` progress turn the progress emit loads the
validator itself; when it is missing, the emit exits 2 naming the tried paths
and the coordinator stops the same way. A store failure stops
`step_machine` coordinators per `@sai/policies/stage-machine.md`, never as a
prose fallback.
