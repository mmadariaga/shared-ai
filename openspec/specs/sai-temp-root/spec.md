# sai-temp-root Specification

## Purpose
TBD - created by archiving change unify-sai-temp-root. Update Purpose after archive.

## Requirements

### Requirement: Per-harness, per-platform SAI temp root

`sai/tools/temp-root.js` SHALL be the resolver of the SAI temp root, the `sai/` folder inside the harness root. On Linux the harness root SHALL be `/tmp/claude-{uid}` for Claude Code and `/tmp/opencode` for opencode, independent of `TMPDIR`, `TEMP`, and `TMP`; on Windows and macOS it SHALL be `<os.tmpdir()>/<harness>`. The resolver SHALL reject any harness other than `claude` or `opencode`.

#### Scenario: Linux roots per harness

- **WHEN** the SAI temp root is resolved on Linux
- **THEN** it is `/tmp/claude-{uid}/sai` for Claude Code and `/tmp/opencode/sai` for opencode

#### Scenario: Windows and macOS use the user temp folder

- **WHEN** the SAI temp root is resolved on Windows or macOS
- **THEN** it is `<os.tmpdir()>/<harness>/sai`

#### Scenario: Unknown harness is rejected

- **WHEN** the resolver receives a harness other than `claude` or `opencode`
- **THEN** it raises a usage error and resolves nothing

### Requirement: Root creation boundaries

On Linux the resolver SHALL NOT create the harness root, and a missing harness root SHALL be a blocker naming the missing path with no fallback to another root. On Windows and macOS the resolver SHALL create the missing `<harness>` folder. On every platform it SHALL create a missing `sai/` folder with mode 0700, applying no chmod on Windows.

#### Scenario: Missing Linux harness root

- **WHEN** the SAI temp root is resolved on Linux and the harness root does not exist
- **THEN** the resolver raises a blocker naming the harness root and creates no folder

#### Scenario: Missing sai folder is created

- **WHEN** the harness root exists and its `sai/` folder does not
- **THEN** the resolver creates `sai/`, with mode 0700 outside Windows

#### Scenario: Off Linux the harness folder is created

- **WHEN** the SAI temp root is resolved on Windows or macOS and `<os.tmpdir()>/<harness>` does not exist
- **THEN** the resolver creates it and reports no blocker

### Requirement: Root safety checks

The harness root and `sai/` SHALL each be a directory that is not a symbolic link. On POSIX the harness root SHALL be owned by the current user or by root, `sai/` SHALL be owned by the current user, and neither SHALL be writable by group or others unless the sticky bit is set. A root that fails a check SHALL be a blocker, and the resolver SHALL write or repair nothing.

#### Scenario: Symbolic-link root is rejected

- **WHEN** the harness root or `sai/` is a symbolic link
- **THEN** the resolver raises a blocker and writes nothing

#### Scenario: Foreign-owned root is rejected

- **WHEN** on POSIX `sai/` is owned by another user
- **THEN** the resolver raises a blocker naming the folder and repairs nothing

#### Scenario: Shared-writable root without sticky bit is rejected

- **WHEN** on POSIX the harness root is writable by group or others and has no sticky bit
- **THEN** the resolver raises a blocker and writes nothing

### Requirement: Temp root CLI

`temp-root.js` SHALL expose `resolve`, `mkdtemp`, and `remove` sub-commands, each taking `--harness claude|opencode` and printing one JSON object: exit 0 on success, 1 on a blocker or rejected path with `ok: false`, `code`, and `error`, and 2 on a usage error. `mkdtemp` SHALL create a private child of the SAI temp root (mode 0700 outside Windows) whose optional `--prefix` starts with a letter or digit and uses only letters, digits, `.`, `_`, and `-`, at most 64 characters, and SHALL return its real path as `dir`. `remove --dir <path>` SHALL delete only a directory strictly inside the SAI temp root that is not a symbolic link, SHALL reject every other path without deleting anything, and SHALL report whether a directory was removed. The CLI SHALL accept no root override.

#### Scenario: mkdtemp returns a private child

- **WHEN** `mkdtemp --harness claude --prefix implement-demo-` runs with a usable root
- **THEN** it prints `ok: true` and a `dir` inside the SAI temp root whose name starts with `implement-demo-`

#### Scenario: remove rejects a path outside the root

- **WHEN** `remove` receives a path that is not strictly inside the SAI temp root
- **THEN** it prints `ok: false`, exits 1, and deletes nothing

#### Scenario: Invalid prefix is a usage error

- **WHEN** `mkdtemp` receives a prefix containing a path separator
- **THEN** it prints `ok: false` and exits 2 without creating a directory
