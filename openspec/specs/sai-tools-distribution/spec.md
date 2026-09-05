# sai-tools-distribution Specification

## Purpose
TBD - created by archiving change project-sai-tools-and-extract-worktree. Update Purpose after archive.
## Requirements
### Requirement: Managed projection of sai tools into both harness roots

The install manifest SHALL carry a `sai-tools` rule that projects the `sai/tools` source directory into the `sai` destination class at path `tools` for both the `claude` and the `opencode` harness, using `strategy: copy`, `recursive: true`, and `include: ["**/*.js"]`, so that every tool file is installed under the same resolved root that serves the prose which invokes it.

#### Scenario: Both harnesses receive the tools
- **WHEN** the installer runs the manifest for a harness
- **THEN** every `*.js` file under `sai/tools` is installed to `sai/tools/` under that harness's resolved install root

#### Scenario: An existing tool becomes reachable outside this repository
- **WHEN** `sai/tools/check-delta-headers.js` is installed by the same rule
- **THEN** the archive coordinator's invocation resolves against an installed copy instead of a path that exists only inside this repository

### Requirement: Tool files carry the managed content-tracked lifecycle

Every file installed by the `sai-tools` rule SHALL declare `ownership: managed` and `drift: content`, so that it enters the doctor census, is verified by checksum, and is removed on uninstall exactly like the projected instruction files.

#### Scenario: Doctor detects an edited tool
- **WHEN** an installed tool file differs in content from its source
- **THEN** doctor reports it as drifted rather than ignoring it

#### Scenario: Uninstall removes the tools
- **WHEN** uninstall runs for a harness
- **THEN** the installed tool files are removed together with the other managed files of that harness

### Requirement: Tools live under sai and never under bin

Runtime tools invoked by command prose SHALL live under `sai/tools/`, and `bin/` SHALL remain reserved for install-time scripts, so that runtime tools travel through the same managed projection as the prose that invokes them.

#### Scenario: A new runtime tool is added
- **WHEN** a deterministic Node tool is added for a command to invoke at runtime
- **THEN** it is placed under `sai/tools/` and is projected by the `sai-tools` rule without a manifest edit

### Requirement: The tools directory is registered in the repository documentation

`AGENTS.md` SHALL list `sai/tools/` in its repository layout and SHALL describe it in the directory registry table, naming the tools it holds and stating that the `sai-tools` projection installs every `*.js` file there into both harness roots as managed, content-tracked files.

#### Scenario: The registry documents the directory
- **WHEN** `AGENTS.md` is read
- **THEN** it carries a `sai/tools/` layout line and a registry row naming `check-delta-headers.js` and `worktree.js` and describing the `sai-tools` projection

