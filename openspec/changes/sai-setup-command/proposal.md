## Why

The npx installer (`bin/install.js`) only configures the global AI editor environment (`~/.claude`). There is no automated path to configure a target project for the SAI workflow — users must manually run `openspec init`, edit `config.yaml`, and copy schema templates. This change adds a `setup` subcommand that handles all project-level SAI configuration in one step, and uses the opportunity to split the monolithic `install.js` into a clean dispatcher + flow modules.

## What Changes

- `bin/install.js` becomes a thin dispatcher routing on `process.argv[2]`; existing behavior on `undefined`/`install` is unchanged
- `bin/install-flow.js` (new): receives all existing install logic extracted verbatim from `install.js`
- `bin/setup.js` (new): implements the `setup` subcommand — checks openspec, ensures config, copies schemas
- `package.json` `bin` entry (`"shared-ai": "bin/install.js"`) unchanged

No behavioral change to the existing install flow. Refactor is pure extraction.

## Capabilities

### New Capabilities

- `dispatcher-refactor`: `install.js` becomes a thin router on `process.argv[2]`; all existing install logic moves verbatim to `bin/install-flow.js`
- `setup-subcommand`: routes `npx github:mmadariaga/shared-ai setup [path]` to `bin/setup.js`; defaults to cwd with Y/n confirmation when no path argument is given
- `openspec-check`: verifies `openspec` binary is in PATH via `which`/`where`; aborts with install URL if not found
- `openspec-init-guard`: checks `{project}/openspec/` directory exists; offers to run `openspec init` via `spawn('openspec', ['init'], { cwd: projectPath })`; aborts if user declines
- `schema-update`: reads `{project}/openspec/config.yaml`, checks for `schema: sai-workflow` line; asks user authorization then patches the file if the value is wrong or absent
- `schema-copy`: copies `{package}/openspec/schemas/sai-workflow/` → `{project}/openspec/schemas/sai-workflow/`, always overwriting

### Modified Capabilities

*(none — existing install behavior is unchanged)*

## Impact

- **`bin/install.js`** — stripped to dispatcher; all logic delegated to `bin/install-flow.js`
- **`bin/install-flow.js`** — new file, contains verbatim extraction of current `install.js` exports and `promptChecklist` entrypoint
- **`bin/setup.js`** — new file implementing the six setup capabilities above
- **`openspec/schemas/sai-workflow/`** — read-only source; no changes
- **`package.json`** — no changes
- **Downstream**: users running `npx github:mmadariaga/shared-ai` with no args or `install` continue to get the existing checklist UI

## Proposal Research Documentation

**Local files**: `bin/install.js`, `openspec/config.yaml`, `package.json`, `openspec/schemas/sai-workflow/schema.yaml`

**External URLs**: none
