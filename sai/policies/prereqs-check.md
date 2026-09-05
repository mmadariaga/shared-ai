# Prerequisite check

## OpenSpec

The three checks are made by `sai/tools/prereqs.js`, not re-derived here. Run
the tool, read its verdict, and print the matching literal below verbatim. Do
not run the checks yourself, do not second-guess a verdict, and do not repair
one.

### The prereqs tool

Use the copy that lives beside this policy file: a copy under a different root
is a different version. Do **not** build its path by joining a root string to a
suffix — composed absolute paths are known to drop a segment (see the "Path
composition" rule in the fetch skill). Take the **first candidate below that
exists**, copied **verbatim**, exactly as written:

On **Claude Code**, in this order:

1. `.claude/sai/tools/prereqs.js` — the project-local root, relative to the working directory.
2. `~/.claude/sai/tools/prereqs.js` — the user-global root.

On **opencode**, in this order:

1. `.opencode/sai/tools/prereqs.js` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/tools/prereqs.js` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths`, take the config directory **exactly as that command prints it** (an XDG override moves it), and use the fixed suffix `sai/tools/prereqs.js` inside it. This is the one place a path is joined at all, and only to a path the harness itself printed.

Whichever candidate wins, the invocation is byte-identical, so a single
whitelist entry per root covers it:

```
node <tool-path> check --json --cwd <project-root>
```

Always pass `--json`, and always pass `--cwd` with the project root the command
was invoked from.

If no candidate exists, say so — name the candidates you tried — and stop; do
not fall back to running the checks in prose.

### Verdict handling (halt if any check fails)

- **exit 0** — payload `verdict: pass`. Every precondition holds; continue.
- **exit 1** — payload `verdict: halt`. One check failed; the payload names it
  in `failed_check` and `reason`. STOP, print the matching literal below
  unchanged, and create or modify no file.
- **exit 2** — usage error or IO failure, reported on stderr. The checks could
  not be completed: report that as-is, print no remediation literal, and do not
  continue as if the checks passed.

Map `failed_check` to its literal and print it with no prefix, suffix,
summary, or rephrasing:

1. `cli` (`reason: openspec-cli-missing`) — the `openspec` binary is not available in PATH. Print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec". To verify by hand, run: `openspec --version`
2. `dir` (`reason: openspec-dir-missing`) — the `openspec/` directory does not exist at the project root. Print: "OpenSpec not initialized in this project. Run: openspec init"
3. `schema` (`reason: schema-not-declared`) — `openspec/config.yaml` has no line matching `^schema:\s*sai-workflow\s*$`. Print: "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml."

Forward the tool's output verbatim where you report it: do not rephrase a
`message`, do not fill in missing fields, and do not repair malformed JSON. If
the payload cannot be parsed, say so and stop.
