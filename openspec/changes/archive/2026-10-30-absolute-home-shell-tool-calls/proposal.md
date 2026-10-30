> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

PowerShell does not expand `~` in the arguments of a native executable, so a documented call such as `node ~/.config/opencode/sai/tools/prereqs.js` fails with `Cannot find module '<project>\~\.config\...'`. A proof of concept on Windows also showed that neither Claude Code nor opencode expands `~` in a permission rule: a `~` rule denies an absolute command, quoted or unquoted. A command that runs from an absolute path therefore needs a permission rule that names the same absolute path to run without a prompt.

## What Changes

- `sai/policies/tool-resolution.md` keeps its `~` candidate lists and now tells the agent to check each candidate with a tool that returns the path it found, run a project-local candidate exactly as written, and run a global candidate as the absolute path the existence check returned, with backslashes turned into forward slashes and the whole path double-quoted (`node "<absolute path>"`). The opencode `opencode debug paths` fallback runs the same way. The "byte-identical invocation, one whitelist entry per root" statement becomes: the installed permission rules hold a rule for the project-local form, the `~` form, and the absolute form of this install.
- `sai/policies/prereqs-check.md` and the `<wait-path>` of `sai/policies/cache-warming.md` apply the same rule to `prereqs.js` and the cache-warming `wait.js`.
- `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` add one permitted change to the out-of-project path rule: a path a tool returned may have its backslashes turned into forward slashes, and nothing else.
- `bin/capabilities.js` `shellPatterns` emits, beside the project-local and `~` forms, an absolute form of every `{sai}`/`{skills}` shell pattern rooted at the install root, with the command path double-quoted (`node "<install root>/sai/...`); a path token ending in a wildcard keeps only its opening quote. The install root is normalized to forward slashes with no trailing separator. Claude Code receives the form in `allowed-tools` as `Bash(...)` and `PowerShell(...)`; opencode receives it as shell permission rules. Without an install root only the project-local and `~` forms are generated.
- The install root travels through `translate`, `projectSource`, `projectFile`, `requirementsProjection`, `profileProjections` (`bin/capabilities.js`), `expandInstallManifest` and the worker matrix (`bin/install-manifest.js`, `bin/worker-matrix.js`), and `expandForInstall` (`bin/install-flow.js`). It defaults to the root being installed into: `~/.claude` for Claude Code and the base `resolveOpencodeBase` resolves for opencode. A project-local refresh writes into the project but names the global install root.
- `bin/doctor.js` `diffAgainstBundled` compares a projection that carries generated text (`sourceText`) against that text, including the tunable-insensitive comparison of managed agents, instead of the raw source file; project-local override records pass the harness base as the install root.
- `bin/uninstall-flow.js` keeps the generated text on each manifest entry and materializes each distinct generated text to its own scratch file, so two enumerations with different roots never overwrite each other's expected source.
- `AGENTS.md` documents that the generated global shell rules name both forms and are therefore machine-specific.
- Tests: a new `test/absolute-home-shell-permissions.test.js` covers both harnesses' generated forms, wildcard quoting, `{skills}` patterns, root normalization, byte-copy instruction projections, worker rendering, doctor and uninstall parity, drift for a foreign home, the customization suffix, the project-local refresh root, and the instruction wording; existing tests pass an install root where they compare projected text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shared-tool-resolution`: global candidates run from the absolute path the existence check returned, double-quoted with forward slashes; project-local candidates run as written; the invocation form is covered by a rule per form.
- `shared-permissions-rule`: copy selection keeps the first-existing order and never composes a path, and a global candidate runs as the path a tool returned.
- `fetch-path-composition`: an out-of-project path a tool returned may have its backslashes turned into forward slashes, and nothing else.
- `contract-tool-capabilities`: generated global shell rules, including the to-backlog preparation declarations, carry the absolute install-root form beside the `~` form, and doctor and uninstall compare permission-carrying projections against their generated text.
- `fetch-resolution-path-scoping`: the composition rule in both fetch skills gains the slash-conversion exception for a tool-returned path, with resolution and namespace rules unchanged.

## Impact

- Modified: `AGENTS.md`, `bin/capabilities.js`, `bin/doctor.js`, `bin/install-flow.js`, `bin/install-manifest.js`, `bin/uninstall-flow.js`, `bin/worker-matrix.js`, `sai/policies/cache-warming.md`, `sai/policies/prereqs-check.md`, `sai/policies/tool-resolution.md`, `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md`, `test/claude-default-preset-alignment.test.js`, `test/explore-agent-tools.test.js`, `test/helpers/capability-source.js`, `test/install-opencode.test.js`.
- New: `test/absolute-home-shell-permissions.test.js`.
- Installed instruction files keep the `~` candidates and stay byte copies of their source; read-tool fetch paths and the wrapper fetch-skill line are unchanged. Windows PowerShell 5.1 and cmd.exe stay unsupported.
- Known limitations: generated permission rules are machine-specific, so a profile copied to another user or machine prompts for each absolute call until a reinstall, and `doctor` reports it as drift; a text difference between the agent's runtime path and the installer's root (drive-letter case, short names) costs a permission prompt for that call. The proof of concept ran on Windows only.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The POC ran on Windows only; Linux and macOS cells were not observed. In one of nine opencode runs an unquoted absolute command ran without a prompt under the `~` rule; the cause is unknown and the result was not reproduced, so it was treated as denied.
