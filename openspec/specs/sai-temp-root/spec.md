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

### Requirement: Harness derivation from the installed path

`sai/tools/temp-root.js` SHALL export `harnessFromInstalledPath(file)`, which SHALL return `opencode` when the nearest harness folder above `file` is `.opencode` or `opencode`, and `claude` when it is `.claude` or when no harness folder lies above `file`. A tool that receives a `--harness` argument SHALL use it; a tool that receives none SHALL take its harness from this derivation applied to its own installed path.

#### Scenario: Installed roots decide the harness

- **WHEN** the derivation receives a path under `.claude/sai/tools/`, `.opencode/sai/tools/`, or `.config/opencode/sai/bin/`
- **THEN** it returns `claude`, `opencode`, and `opencode` respectively

#### Scenario: The nearest harness folder wins

- **WHEN** the path lies under a `.claude` folder that is itself inside an `opencode` folder
- **THEN** the derivation returns `claude`

#### Scenario: A source checkout counts as Claude Code

- **WHEN** the path lies in a source checkout with no harness folder above it
- **THEN** the derivation returns `claude`

### Requirement: Verified private child creation

On POSIX, `makeTempDir` SHALL verify the child it creates before returning it. On Linux the SAI temp root's real path SHALL equal its resolved path. The new child SHALL be a direct child of the SAI temp root, and SHALL be a directory, not a symbolic link, owned by the current user with no group or other permission bits. Its mode SHALL be set to 0700 through a no-follow directory descriptor whose identity matches the created child, and it SHALL be verified again through that descriptor and by path. When verification ends, the SAI temp root SHALL still pass its safety checks with an unchanged device and inode, the child SHALL keep its device and inode, and the child's real path SHALL lie directly inside the root's real path. A failed check SHALL raise a blocker, and the child SHALL NOT be returned as usable. On Windows the resolver SHALL create the child and return its real path without these POSIX checks, resolved with the native real-path resolution so that 8.3 short names are expanded and the returned path is the native long form; when the provided file-system interface has no native resolver, it SHALL fall back to the ordinary real-path resolution. On Windows `resolveTempRoot` SHALL keep returning the SAI temp root in the spelling of `TEMP`, so the root and a created child MAY differ in spelling. Every caller of `makeTempDir` SHALL receive this verification.

#### Scenario: Verified child is returned

- **WHEN** `makeTempDir` runs on POSIX with a usable root and every check passes
- **THEN** it returns the real path of a new current-user-owned, non-symbolic-link child with mode 0700 directly inside the SAI temp root

#### Scenario: Child identity changes during creation

- **WHEN** the created child's descriptor or later lstat identity differs from the identity first observed, or the child is not private
- **THEN** `makeTempDir` raises a blocker and returns no directory

#### Scenario: Root changes during creation

- **WHEN** the SAI temp root's device, inode, or safety checks differ after the child is created
- **THEN** `makeTempDir` raises a blocker and returns no directory

#### Scenario: Windows child is returned in native long form

- **WHEN** `makeTempDir` runs on Windows and the SAI temp root is spelled with 8.3 short names
- **THEN** it returns the native long form of the created child

#### Scenario: Long-form root keeps its spelling on Windows

- **WHEN** `makeTempDir` runs on Windows and the SAI temp root is already spelled in long form
- **THEN** it returns the created child in that same long-form spelling

#### Scenario: Windows without a native resolver

- **WHEN** `makeTempDir` runs on Windows with a file-system interface whose real-path resolver has no native variant
- **THEN** it resolves the created child with the ordinary real-path resolver

### Requirement: Every SAI temp writer uses the shared resolver

`bin/sai-state.js`, `sai/tools/to-pr.js`, `sai/tools/azure-publication.js`, `sai/tools/slice-path-scope.js`, and the to-backlog `scripts/prepare-temp.js` SHALL resolve every temporary path through `temp-root.js` and its checks, and no SAI tool other than `temp-root.js` SHALL compute a temporary root from `os.tmpdir()`, `TMPDIR`, or a literal `/tmp` path. Claude Code and opencode SHALL follow the same rules.

#### Scenario: Source guard over the tools

- **WHEN** the test suite scans `bin/sai-state.js`, the to-backlog `prepare-temp.js`, and every `sai/tools/*.js` except `temp-root.js`
- **THEN** none of them contains `os.tmpdir()`, `TMPDIR`, or a `/tmp` string literal

#### Scenario: Azure payloads use the SAI temp root

- **WHEN** an Azure publication call sends a JSON body
- **THEN** the payload file is written in a private `azure-publication-` child of the SAI temp root

### Requirement: Removal compares native real paths on Windows

`temp-root.js remove` SHALL resolve the SAI temp root, the target directory, and the nearest existing ancestor of a missing target with the same resolver before it decides whether the target is strictly inside the root. On Windows that resolver SHALL be the native real-path resolution, so the 8.3 short form and the long form of one directory compare equal. On every other platform the resolver SHALL stay the one used before this change. A target that resolves outside the SAI temp root SHALL still be rejected with nothing deleted.

#### Scenario: Long form of a short-form directory is removed

- **WHEN** on Windows `mkdtemp` returned a directory in 8.3 short form and `remove` receives the long form of that directory
- **THEN** the directory is removed and the result reports that a directory was removed

#### Scenario: Path outside the root is still rejected on Windows

- **WHEN** on Windows `remove` receives a directory that resolves outside the SAI temp root
- **THEN** it rejects the path with `REJECTED_PATH` and deletes nothing
