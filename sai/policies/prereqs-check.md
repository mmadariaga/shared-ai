# Prerequisite check

`sai/tools/prereqs.js` makes the four OpenSpec checks. Run it, read its verdict, and print the matching literal verbatim. The tool's verdict is final: do not run the checks yourself, second-guess a verdict, or repair one.

## Locate the tool

Resolve `sai/tools/prereqs.js` with the fetch tool in path mode, per `@sai/policies/tool-resolution.md`: name the subpath `sai/tools/prereqs.js` twice in one call (a one-subpath call prints the file), and run the copy it returns as that policy states. The first copy it returns defines the version.

## Run it

Pass the project root the command was invoked from and the harness you are running on:

- Claude Code: `node <tool-path> check --json --cwd <project-root> --require-openspec-skills claude`
- opencode: `node <tool-path> check --json --cwd <project-root> --require-openspec-skills opencode`

## Verdict

- **exit 0**, `verdict: pass`: every check holds; continue.
- **exit 1**, `verdict: halt`: STOP, print the literal mapped to `failed_check` below with no prefix, suffix, summary, or rephrasing, and create or modify no file.
- **exit 2**, a usage or IO error on stderr; or the fetch tool resolves no copy; or the payload does not parse: the check is **incomplete**. Report exactly that (the stderr text, the paths tried, or the unparseable payload), print no remediation literal, and stop.

`failed_check` literals:

1. `cli` (`reason: openspec-cli-missing`): "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec — To verify by hand, run: `openspec --version`"
2. `dir` (`reason: openspec-dir-missing`): "OpenSpec not initialized in this project. Run: openspec init"
3. `schema` (`reason: schema-not-declared`): "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml."
4. `skills` (`reason: openspec-skill-missing`): "OpenSpec skills missing at <skills-root>: <missing_skills>. Run: openspec init to install them for this harness." Fill `<missing_skills>` with the payload's `missing_skills` joined by commas, and `<skills-root>` with the `root` of the `skills` entry in the payload's `checks` array.
