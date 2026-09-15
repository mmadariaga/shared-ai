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
`worker-report-validator.js`, `pr.js`) for `<name>` below.

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

- `commit.js` and `pr.js`: `node <tool-path> <subcommand> --json --cwd
  <project-root>` plus the sub-command's required flags (`pr.js collect` also
  takes `--change`; `pr.js apply` takes `--cwd` plus `--parent` where needed
  and no `--json`, since `--json` and `--change` are `collect`-only).
- `check-delta-headers.js`: `node <tool-path> <change-name> [--json]
  [--root <dir>] [--delta-dir <dir>] [--specs-dir <dir>]`; it takes no
  `--cwd`.
- `worker-report-validator.js`: `node <tool-path> validate --kind <kind>`
  with the payload on stdin (plus `--json --cwd` where the tool accepts
  them).
- `bin/sai-state.js` verbs (`spawn`, `emit`, `reset`, `close`): `node
  <tool-path> <verb> ...` with the verb's own arguments; they take neither
  `--json` nor `--cwd`.

If no candidate exists, say so — name the candidates you tried — and stop; do
not fall back to running the operation in prose. A missing validator never
skips validation: resolve `worker-report-validator.js` on every Result Loop
turn and stop the same way when unresolvable. A store failure stops
`step_machine` coordinators per `@sai/policies/stage-machine.md`, never as a
prose fallback.
