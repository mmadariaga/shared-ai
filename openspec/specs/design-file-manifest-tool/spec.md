# design-file-manifest-tool Specification

## Purpose
Define the deterministic fold and verification of the design File Manifest by `sai/tools/file-manifest.js`, called from the design tasks step. The tool replaces a prose fold table so the manifest is computed once, reproducibly, and verified against `design.md`.

## Requirements

### Requirement: File Manifest is written by a deterministic tool

The `fold` sub-command of `sai/tools/file-manifest.js` SHALL fold every `## Step N` section's `**Files Affected**` entries of a change's `tasks.md` into the `### File Manifest` subsection of the same change's `design.md` and write it there. When `design.md` has no `### File Manifest` subsection, the tool SHALL create it beneath `### Architecture Snapshot`. The write SHALL be idempotent: a run whose fold equals the persisted manifest SHALL report `unchanged` and SHALL NOT rewrite `design.md`.

#### Scenario: fold writes the net-folded manifest

- **WHEN** `tasks.md` lists `A x/a.md` and `M x/b.md` in Step 1 and `M x/a.md` in Step 2, and `fold` runs
- **THEN** the `### File Manifest` subsection of `design.md` contains `A x/a.md (Step 1, Step 2)` and `M x/b.md (Step 1)`

#### Scenario: fold is idempotent

- **WHEN** `fold` runs a second time on unchanged `tasks.md` and `design.md`
- **THEN** it reports `unchanged` and leaves `design.md` byte-identical

#### Scenario: fold creates a missing manifest

- **WHEN** `design.md` has a `## Target State` section with `### Architecture Snapshot` but no `### File Manifest`, and `fold` runs
- **THEN** the tool writes `### File Manifest` with the folded lines directly after the snapshot, before the next `##` section

#### Scenario: empty fold carries the None sentinel

- **WHEN** every path in `tasks.md` is created in one Step and deleted in a later Step, and `fold` runs
- **THEN** the manifest body is the `None — no files affected` sentinel followed by its one-line reason

### Requirement: The tool reproduces the normative net fold

`sai/tools/file-manifest.js` SHALL produce exactly the lines that the net-fold transition table, step attribution, line format, and byte-wise sort of the `design-target-state` capability require, treating that capability as the normative definition and the tool as a move from prose to code rather than a semantic change. Lines SHALL be sorted byte-wise by path, using the destination path for `R` lines.

#### Scenario: a chained rename follows the path

- **WHEN** `tasks.md` lists `R a.md -> b.md` in Step 2 and `R b.md -> c.md` in Step 4
- **THEN** the fold yields `R a.md -> c.md (Step 2, Step 4)` and no line mentions `b.md`

#### Scenario: a path created and later deleted is omitted

- **WHEN** `tasks.md` lists `A docs/tmp.md` in Step 2 and `D docs/tmp.md` in Step 6
- **THEN** the fold yields no line for `docs/tmp.md`

#### Scenario: R lines sort by destination path byte-wise

- **WHEN** a Step renames `z-old.ts` to `a-new.ts`, modifies `b-mid.ts`, and adds `B.ts`
- **THEN** the fold yields `A B.ts`, then `R z-old.ts -> a-new.ts`, then `M b-mid.ts`, each with its step attribution

### Requirement: Verify mode compares the persisted manifest with the fold

The `verify` sub-command SHALL compute the same fold without writing any file and SHALL compare it with the persisted `### File Manifest` subsection of `design.md`. It SHALL report `match` and exit 0 when they are equal, `diverged` and exit 1 when they differ, and `missing` and exit 1 when `design.md` has no `### File Manifest` subsection.

#### Scenario: verify reports a match

- **WHEN** the persisted manifest equals the fold and `verify` runs
- **THEN** it reports `match` and exits 0

#### Scenario: verify reports a divergence

- **WHEN** the persisted manifest differs from the fold and `verify` runs
- **THEN** it reports `diverged` with the expected and persisted lines, exits 1, and leaves `design.md` unchanged

#### Scenario: verify reports a missing manifest

- **WHEN** `design.md` has no `### File Manifest` subsection and `verify` runs
- **THEN** it reports `missing` and exits 1

### Requirement: Invalid input fails with a located diagnostic and no write

The tool SHALL report each malformed `**Files Affected**` entry (an unknown token or a missing path) and each illegal transition (for example `M` after `D`) with the `tasks.md` line and Step, SHALL fail with exit 1, and SHALL NOT write `design.md`. It SHALL fail the same way, with no write, when `tasks.md` has no `**Files Affected**` entries or when a missing manifest has no `## Target State` section in `design.md` to hold it. A usage or I/O error SHALL exit 2.

#### Scenario: malformed entries fail with line numbers

- **WHEN** `tasks.md` contains the entries `X foo.md` and `M` with no path, and `fold` runs
- **THEN** the tool exits 1 with one diagnostic per entry naming its `tasks.md` line, and `design.md` is unchanged

#### Scenario: an illegal transition fails with its location

- **WHEN** `tasks.md` lists `D a.md` in Step 1 and `M a.md` in Step 2
- **THEN** the tool reports one error naming Step 2 and its line, and writes nothing

#### Scenario: a usage error exits 2

- **WHEN** the tool runs with no sub-command
- **THEN** it exits 2

### Requirement: The tool is resolved and projected like every sai tool

`sai/tools/file-manifest.js` SHALL be located through `sai/policies/tool-resolution.md` on both Claude Code and opencode and invoked as `node <tool-path> <fold|verify> <change-name> --json --cwd <project-root>`. `sai/policies/tool-resolution.md` SHALL list the tool name and this invocation form. The existing `sai-tools` projection SHALL install the tool for both harnesses without a per-tool `sai/install-manifest.json` entry.

#### Scenario: the tool resolves from either harness root

- **WHEN** a design step needs `file-manifest.js` on Claude Code or opencode
- **THEN** it uses the first existing per-harness candidate from `sai/policies/tool-resolution.md` verbatim and invokes it in the listed form

#### Scenario: projection needs no new manifest entry

- **WHEN** `sai/install-manifest.json` is inspected
- **THEN** it carries the `sai-tools` projection and no entry that names `file-manifest`

### Requirement: The design steps delegate the manifest to the tool

After Tasks is fully written, `sai/commands/design/steps/tasks.md` SHALL direct the design worker to run `file-manifest.js fold` and treat a non-zero exit as blocking until Files Affected entries are corrected. The tasks step SHALL NOT carry the fold transition table in prose. The design step SHALL NOT plan, author, or pre-fill manifest lines or a placeholder.

Overview generation SHALL exclude the persisted design File Manifest and copy literal per-Step Files Affected instead. It SHALL NOT require `file-manifest.js verify` for overview validation. This separation SHALL NOT change the tool's fold or verify semantics, design manifest generation, or design-step error handling.

#### Scenario: the tasks step runs the tool
- **WHEN** a design run finishes writing Tasks
- **THEN** its tasks step instructs running fold and stopping on a non-zero exit

#### Scenario: the design step does not pre-plan the manifest
- **WHEN** the design step runs before Tasks exists
- **THEN** design carries no handwritten manifest or placeholder and the manifest appears only after the tasks step runs the tool

#### Scenario: overview validation uses the verify verdict
- **WHEN** the overview generator validates a candidate
- **THEN** it validates literal per-Step Files Affected and source correspondence without consuming a manifest verify verdict

#### Scenario: independent verify behavior remains unchanged
- **WHEN** file-manifest verify is invoked independently of overview generation
- **THEN** it retains its existing read-only match, divergence, and missing-manifest outcomes
