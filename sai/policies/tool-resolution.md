# Tool Resolution

Fetch `@sai/policies/tool-call-notes.md`

Single source for tool-location resolution. Every command that runs
`sai/tools/*.js` or `bin/sai-state.js` fetches this file and SHALL NOT
restate the order inline — commands only reference it with a filename
substitution, to avoid drift between copies.

Resolve a tool with the fetch tool in path mode, the same tool that resolves
every `Fetch @` directive (`@skills/fetch/SKILL.md` states how to run it on your
harness). It looks in the project-local root of the working directory and then in
the one user-global root of your harness, which it resolves itself:
`CLAUDE_CONFIG_DIR` (default `~/.claude`) on Claude Code, and on opencode the
`config` directory that `opencode debug paths` prints, else
`$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`. This file lists no root
candidates of its own: the first copy the fetch tool returns is the copy to run,
and it defines the version.

Pass the tool's subpath, never a path you composed. Path mode (resolution blocks
only, no file content) starts at two subpaths in one call: name every tool the
step needs together, and when it needs one, name that subpath twice, because a
one-subpath call prints the whole file after its header. A subpath names one file under the root and
begins with `sai/`, `commands/`, or `skills/`: a bare `bin/...` subpath is
rejected by the fetch scope.

- `sai/tools/<name>` for a tool of `sai/tools/` (substitute the concrete file
  name for `<name>`, for example `prereqs.js`, `change-picker.js`, `commit.js`,
  `check-delta-headers.js`, `worker-report-validator.js`, `to-pr.js`,
  `file-manifest.js`, `transfer.js`, `temp-root.js`, `change-telemetry.js`,
  `dispose-shells.js`).
- `sai/bin/sai-state.js` for the state CLI.
- `skills/sai-cache-warmer/wait.js` for the cache-warm wait tool.

```
node "<fetch tool>" --harness <claude|opencode> sai/tools/<name> sai/tools/<name>
```

Each resolution block prints `path:` (absolute, `/` separators) and `root:`.
Run the tool as follows, the same way on both harnesses:

- `root: project`: run the project-local form exactly as written, relative to the
  working directory (`node .claude/sai/tools/<name>` on Claude Code,
  `node .opencode/sai/tools/<name>` on opencode).
- `root: global`: run the `path:` the block printed, double-quoted:
  `node "<absolute path>"`. PowerShell does not expand `~` in the arguments of a
  native executable, so no `~` text ever reaches the shell. Forward slashes and
  the quotes keep the command text identical across Bash and PowerShell, and a
  home path with spaces stays one argument. On Windows the path reads
  `C:/Users/<user>/.claude/sai/tools/<name>`, on Linux `/home/<user>/...`, on
  macOS `/Users/<user>/...`; a `CLAUDE_CONFIG_DIR` or an opencode config
  directory elsewhere shows up in the printed path and nowhere else.

In a spelled call, `<tool-path>` stands for that run form of the tool the
instruction names. Two tools have their own marker: `<transfer-path>` is the
run form of `sai/tools/transfer.js` and `<sai-state-path>` that of
`sai/bin/sai-state.js`.

A call whose block carries `error:` for a subpath resolved nothing for it: the
message names the paths tried, and that subpath is unresolved.

## Invocation

Apply's coordinator-only `checkpoint-plan` subcommand takes `--change <change-name> --baseline <ref> --cwd <project-root>`, optional retained `--settled <ref>`, and no stdin. Its returned reference is supplied as `--plan-checkpoint <ref>` to close after an authorized coordinator plan write. Cumulative verification and close otherwise compare the plan with the original baseline or settled receipt; this flag is not a worker-write exemption.

**Structured input is an input file.** A tool that reads structured input (JSON,
a message, a block, an issue description) takes it with `--input-file <path>`,
never from a stdin pipe, heredoc, here-string, or command argument: those forms
fail on at least one harness for JSON (Claude Code rejects a heredoc whose body
has a brace beside a quote; opencode rejects the `echo` pipe and corrupts heredoc
JSON). Open one private directory with `transfer.js` as
`node <transfer-path> open --note "open the transfer directory" --harness <claude|opencode>`,
write the input as UTF-8 to a unique file in the returned `dir` with the
harness-native file-write tool (`Write` on Claude Code, `write` on opencode),
and pass that absolute path. Each call uses its own file,
so parallel calls never share one, and input files stay inside the SAI temp root,
outside the repository. A request that carries model-written free text, such as the title and description of `to-pr.js` and `to-backlog.js`, may be written as YAML in a `.yaml` file, with the Markdown in a `|` block scalar of the YAML subset of `sai/tools/yaml-subset.js`; a file whose first non-blank character is `{` is read as JSON. The tool receives the bytes exactly and exits 2 naming
the path, changing no state, when the file is missing, unreadable, or empty.
`--input-file` wins over stdin; the `-` stdin form stays accepted only so
instructions installed before the input file keep working. Close the directory
with `node <transfer-path> close --note "close the transfer directory" --dir <dir>` when the work no longer needs it. Every
command profile that hands structured input to a tool can write there: its
native write is limited to the SAI temp root.

Whichever root answers, the invocation keeps one form within one harness, so
the installed permission rules cover it: a rule per root exists for the
project-local form, the `~` form, and the absolute form of this install. Keep each
tool's own accepted flag set; do not change invocation semantics beyond path
resolution.

**The invocation form comes from the tool.** When you are unsure of the form of a
call, or a call ends with a usage error, run `node <tool-path> <subcommand> --help`
(`node <tool-path> --help` for a tool without subcommands) and use the usage and
examples it prints. `to-pr.js`, `to-backlog.js`, and `from-backlog.js` are called
as their owning universal skill defines. This file keeps only what `--help` does
not carry: what a result means.

## Results

- `scenario-coverage.js` prints one JSON object whose `verdict` is `clean`,
  `missing`, or `n/a`, with `missing`, `ambiguous`, `parent_branch`, and
  `change_base`. Exit 0 is `clean` or `n/a`, 1 is `missing`, and 2 is a usage or
  I/O error. `--parent-branch` names the branch the change base is taken against,
  and a branch that does not resolve is an error.
- `test-select.js` `select` prints `verdict` (`selected` or `full`), `tests`, and
  `reason` (null, or `no-binary`, `no-index`, `sync-failed`, `stale-index`,
  `unindexed-file`, `no-dependents`, `deleted-file`, `base-index-failed`,
  `codegraph-error`, `timeout`, `invalid-output`); `swap` and `restore` print
  `verdict` `swapped`, `refused`, `restored`, `clean`, or `failed`. Exit 0 is any
  verdict but `refused` and `failed` (1); 2 is a usage or I/O error.
- `risk-signals.js` always prints one JSON object: `status: ok` with the
  merge-base, fingerprint, and floors, or with the stored block's `state`; or
  `status: blocked` with a `message`.
- `change-document.js` always prints one JSON verdict and takes no `--cwd`; `compose` prints `{document_file, hash}`.
- `issue-precheck.js` always prints one JSON object `{checked, missing}` and exits 0 whether or not references are missing; exit 2 is a usage or I/O error. It informs and never decides.
- `change-telemetry.js` always prints one JSON line (`written` or `skipped`),
  takes no `--json`, and exits 2 only for a usage error. `explore-origin` prints
  `{"outcome": "found", "session": <explore root session>}` or
  `{"outcome": "skipped", "reason": ...}`.
- `decision-records.js` always prints one JSON object with `index_exists`,
  `records`, `next_number`, and `duplicates`, read from `docs/<family>/` and its
  `archive/` on disk.
- `backfill-no-specs.js` `compose` prints one JSON object.
- `check-delta-headers.js` takes no `--cwd`. `tool-access.js` and the `bin/sai-state.js`
  verbs (`spawn`, `emit`, `reset`, `close`) take neither `--json` nor `--cwd`;
  `tool-access.js` prints JSON.
- `bin/sai-state.js` `emit` builds an identifier event from flags; `--input-file
  <path>` carries an event that holds free text or a path the flags reject. The
  progress emit loads the validator module itself, relative to the resolved
  `sai-state.js`, so it needs no separate `worker-report-validator.js` resolution
  and stays byte-identical whichever `sai-state.js` copy the fetch tool returns.
  `transfer.js receive` does the same relative to the resolved `transfer.js`.

## When a tool does not resolve

If the fetch tool resolves no copy, say so — name the paths its error block lists — and stop, unless the consuming instruction explicitly declares that its gate is optional when the tool is missing. That exception skips only the named gate; it never substitutes a prose check. A missing validator never
skips validation: resolve `worker-report-validator.js` on every turn that runs
a separate `validate` call and stop the same way when unresolvable, never
interpreting a worker report by reading it (`@sai/policies/worker-report-transport.md`); a progress
emit, and `transfer.js receive`, load the validator itself and, when it is missing, exit 2 naming the
tried paths. A missing `sai-state.js` is a store failure: a card that declares
its own store fallback (the goal-driven coordinators carry on from their static
step order or `run-state.md`, because their store never gates the run) follows
that fallback instead of stopping, and every other consumer follows
`@sai/policies/stage-machine.md`.
