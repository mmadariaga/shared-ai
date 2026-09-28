# Prerequisite check

`sai/tools/prereqs.js` makes the four OpenSpec checks. Run it, read its verdict, and print the matching literal verbatim. The tool's verdict is final: do not run the checks yourself, second-guess a verdict, or repair one.

## Locate the tool

Take the first candidate that exists, copied verbatim; never build the path by joining a root string to a suffix. The first existing copy defines the version. (The order mirrors `@sai/policies/tool-resolution.md`.)

On **Claude Code**:

1. `.claude/sai/tools/prereqs.js` — the project-local root, relative to the working directory.
2. `~/.claude/sai/tools/prereqs.js` — the user-global root.

On **opencode**:

1. `.opencode/sai/tools/prereqs.js` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/tools/prereqs.js` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths` and use `sai/tools/prereqs.js` inside the config directory exactly as that command prints it.

## Run it

Pass the project root the command was invoked from and the harness you are running on:

- Claude Code: `node <tool-path> check --json --cwd <project-root> --require-openspec-skills claude`
- opencode: `node <tool-path> check --json --cwd <project-root> --require-openspec-skills opencode`

## Verdict

- **exit 0**, `verdict: pass`: every check holds; continue.
- **exit 1**, `verdict: halt`: STOP, print the literal mapped to `failed_check` below with no prefix, suffix, summary, or rephrasing, and create or modify no file.
- **exit 2**, a usage or IO error on stderr; or no candidate exists; or the payload does not parse: the check is **incomplete**. Report exactly that (the stderr text, the candidates tried, or the unparseable payload), print no remediation literal, and stop.

`failed_check` literals:

1. `cli` (`reason: openspec-cli-missing`): "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec — To verify by hand, run: `openspec --version`"
2. `dir` (`reason: openspec-dir-missing`): "OpenSpec not initialized in this project. Run: openspec init"
3. `schema` (`reason: schema-not-declared`): "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml."
4. `skills` (`reason: openspec-skill-missing`): "OpenSpec skills missing at <skills-root>: <missing_skills>. Run: openspec init to install them for this harness." Fill `<missing_skills>` with the payload's `missing_skills` joined by commas, and `<skills-root>` with the `root` of the `skills` entry in the payload's `checks` array.
