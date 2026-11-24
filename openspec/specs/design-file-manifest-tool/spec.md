# design-file-manifest-tool Specification

## Purpose
Define the deterministic fold and verification of the design File Manifest by `sai/tools/file-manifest.js`, called from the design tasks step. The tool replaces a prose fold table so the manifest is computed once, reproducibly, and verified against `design.md`.

## Requirements

### Requirement: File Manifest is written by a deterministic tool

The `fold` sub-command of `sai/tools/file-manifest.js` SHALL fold the `**Files Affected**` entries of every `## Step N` section of a change's `tasks.md` that carries them (the steps without tests) into the `### File Manifest` subsection of the same change's `design.md` and write it there. When no step carries `**Files Affected**` and `tasks.md` has at least one step, the tool SHALL write the sentinel `None — every file passes through the plan RED` as the manifest body. When `design.md` has no `### File Manifest` subsection, the tool SHALL create it at the end of `## Target State`, before the next `##` section; when a `design.md` written before the Architecture Snapshot retired still carries `### Architecture Snapshot`, it SHALL create it after that subsection. Every non-empty manifest entry SHALL be emitted as a Markdown bullet prefixed with `- `, with one logical entry per line. The empty sentinels and their reason SHALL remain unbulleted. The write SHALL be idempotent: a run whose fold equals the persisted manifest SHALL report `unchanged` and SHALL NOT rewrite `design.md`.

#### Scenario: fold writes the net-folded manifest

- **WHEN** `tasks.md` lists `A x/a.md` and `M x/b.md` in Step 1 and `M x/a.md` in Step 2, and `fold` runs
- **THEN** the `### File Manifest` subsection of `design.md` contains `- A x/a.md (Step 1, Step 2)` and `- M x/b.md (Step 1)` on separate lines

#### Scenario: fold is idempotent

- **WHEN** `fold` runs a second time on unchanged `tasks.md` and `design.md`
- **THEN** it reports `unchanged` and leaves `design.md` byte-identical

#### Scenario: fold creates a missing manifest

- **WHEN** `design.md` has a `## Target State` section with no `### Architecture Snapshot` and no `### File Manifest`, and `fold` runs
- **THEN** the tool writes `### File Manifest` with the folded lines at the end of `## Target State`, before the next `##` section

#### Scenario: empty fold carries the None sentinel

- **WHEN** every path in `tasks.md` is created in one Step and deleted in a later Step, and `fold` runs
- **THEN** the manifest body is the `None — no files affected` sentinel followed by its one-line reason

#### Scenario: Explicit regeneration upgrades legacy presentation once

- **WHEN** fold runs on a valid legacy unbulleted manifest and then runs again without task changes
- **THEN** the first run emits single-prefixed bullet entries and the second reports unchanged without duplicating bullets

#### Scenario: fold places a missing manifest after a legacy snapshot

- **WHEN** a `design.md` written before the Architecture Snapshot retired has `### Architecture Snapshot` under `## Target State` but no `### File Manifest`, and `fold` runs
- **THEN** the tool writes `### File Manifest` directly after the snapshot, before the next `##` section

#### Scenario: fold of a change whose steps all have tests

- **WHEN** every step of `tasks.md` lists `**Scenarios**`, none carries `**Files Affected**`, and `fold` runs
- **THEN** the manifest body is the `None — every file passes through the plan RED` sentinel and the run exits 0

### Requirement: The tool reproduces the normative net fold

`sai/tools/file-manifest.js` SHALL produce exactly the lines that the net-fold transition table, step attribution, line format, and byte-wise sort of the `design-target-state` capability require, treating that capability as the normative definition and the tool as a move from prose to code rather than a semantic change. The rendered non-empty lines SHALL carry a single `- ` presentation prefix; the underlying net-fold transitions, tokens, paths, grouping, and Step attribution SHALL remain unchanged. Lines SHALL be sorted byte-wise by path, using the destination path for `R` lines.

#### Scenario: a chained rename follows the path

- **WHEN** `tasks.md` lists `R a.md -> b.md` in Step 2 and `R b.md -> c.md` in Step 4
- **THEN** the fold yields `- R a.md -> c.md (Step 2, Step 4)` and no line mentions `b.md`

#### Scenario: a path created and later deleted is omitted

- **WHEN** `tasks.md` lists `A docs/tmp.md` in Step 2 and `D docs/tmp.md` in Step 6
- **THEN** the fold yields no line for `docs/tmp.md`

#### Scenario: R lines sort by destination path byte-wise

- **WHEN** a Step renames `z-old.ts` to `a-new.ts`, modifies `b-mid.ts`, and adds `B.ts`
- **THEN** the fold yields `- A B.ts`, then `- R z-old.ts -> a-new.ts`, then `- M b-mid.ts`, each with its step attribution

### Requirement: Verify mode compares the persisted manifest with the fold

The `verify` sub-command SHALL compute the same fold without writing any file and SHALL compare it with the persisted `### File Manifest` subsection of `design.md`. It SHALL report `match` and exit 0 when they are equal after allowing each expected non-empty entry either with its single `- ` prefix or without that prefix, `diverged` and exit 1 when they differ, and `missing` and exit 1 when `design.md` has no `### File Manifest` subsection.

#### Scenario: verify reports a match

- **WHEN** the persisted manifest equals the fold and `verify` runs
- **THEN** it reports `match` and exits 0

#### Scenario: verify reports a divergence

- **WHEN** the persisted manifest differs from the fold and `verify` runs
- **THEN** it reports `diverged` with the expected and persisted lines, exits 1, and leaves `design.md` unchanged

#### Scenario: verify reports a missing manifest

- **WHEN** `design.md` has no `### File Manifest` subsection and `verify` runs
- **THEN** it reports `missing` and exits 1

Verification SHALL ignore only this optional presentation prefix. Paths, change indicators, ordering, rename endpoints, Step references, and other line content SHALL still participate in comparison. Verification SHALL NOT rewrite legacy artifacts.

#### Scenario: Legacy manifest verifies without migration

- **WHEN** a persisted manifest contains the expected entries without bullet prefixes and verify runs
- **THEN** it reports match, exits 0, and leaves design.md byte-identical

#### Scenario: Content differences are not presentation differences

- **WHEN** a persisted manifest changes an entry's path, token, rename endpoint, ordering, Step attribution, or adds an extra prefix or note
- **THEN** verify reports diverged, exits 1, and leaves design.md unchanged

### Requirement: Invalid input fails with a located diagnostic and no write

The tool SHALL report each malformed `**Files Affected**` entry (an unknown token or a missing path) and each illegal transition (for example `M` after `D`) with the `tasks.md` line and Step, SHALL fail with exit 1, and SHALL NOT write `design.md`. Unsafe paths, invalid bounded generated declarations, overlapping generated families, and generated collisions recognized by the fold SHALL fail with the same located diagnostics and no write.

It SHALL fail the same way when `tasks.md` has no `## Step N` section and neither affected entries nor recognized `None` declarations, or when a missing manifest has no `## Target State` section in `design.md` to hold it. A `tasks.md` whose steps all lack `**Files Affected**` SHALL NOT fail: it takes the plan RED sentinel. Recognized `None` declarations SHALL count as intentional empty input rather than absent input. A usage or I/O error SHALL exit 2.

#### Scenario: malformed entries fail with line numbers
- **WHEN** `tasks.md` contains the entries `X foo.md` and `M` with no path, and `fold` runs
- **THEN** the tool exits 1 with one diagnostic per entry naming its `tasks.md` line, and `design.md` is unchanged

#### Scenario: an illegal transition fails with its location
- **WHEN** `tasks.md` lists `D a.md` in Step 1 and `M a.md` in Step 2
- **THEN** the tool reports one error naming Step 2 and its line, and writes nothing

#### Scenario: a usage error exits 2
- **WHEN** the tool runs with no sub-command
- **THEN** it exits 2

#### Scenario: Declared empty affected set is intentional
- **WHEN** tasks explicitly declare recognized None values and contain no affected paths
- **THEN** fold accepts the intentional empty set instead of reporting missing declarations

#### Scenario: Unsafe declaration fails without a write
- **WHEN** tasks contain a parent-traversing path or unsupported recursive generated wildcard
- **THEN** fold and verify fail with diagnostics and leave design.md unchanged

### Requirement: The tool is resolved and projected like every sai tool

`sai/tools/file-manifest.js` SHALL be located through `sai/policies/tool-resolution.md` on both Claude Code and opencode and invoked as `node <tool-path> <fold|verify> <change-name> --json --cwd <project-root>`. `sai/policies/tool-resolution.md` SHALL list the tool name and this invocation form. The existing `sai-tools` projection SHALL install the tool for both harnesses without a per-tool `sai/install-manifest.json` entry.

#### Scenario: the tool resolves from either harness root

- **WHEN** a design step needs `file-manifest.js` on Claude Code or opencode
- **THEN** it uses the copy the fetch tool returns in path mode for the subpath `sai/tools/file-manifest.js`, as `sai/policies/tool-resolution.md` states, and invokes it in the listed form

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

### Requirement: Manifest and Apply share affected-file declaration parsing

File Manifest generation SHALL use Apply's parseDeclaration function rather than an independent affected-file parser. Exact entries, rename validation, recognized None declarations, unsafe-path rejection, and bounded generated syntax SHALL use that shared interpretation.

Generated declarations SHALL retain their expected count in the derivative manifest line. Fold SHALL reject overlapping generated families and generated-family collisions reported by its fold state, with located diagnostics and no design write. Ordinary net-fold transitions, step attribution, ordering, idempotence, and verify behavior SHALL remain unchanged.

#### Scenario: Generated declaration uses backticks
- **WHEN** tasks declare a valid bounded family with backticked entry or path syntax
- **THEN** Manifest and Apply interpret the same family and count

#### Scenario: Generated manifest is verified
- **WHEN** the persisted manifest contains the same generated family, expected count, and Step attribution as the fold
- **THEN** verify reports a match without writing design.md

### Requirement: The format sub-command answers the tasks.md format

The `format` sub-command of `sai/tools/file-manifest.js`, invoked as `node <tool-path> format <change-name> --json --cwd <project-root>`, SHALL read only the change's `tasks.md`, write nothing, and answer `current` with exit 0 or `earlier` with exit 1. It SHALL answer `earlier`, listing each signal it found, when `tasks.md` has a `## Required Documentation` section, a step that carries `**What Will Be Done**`, a step that carries `**Existing Tests Broken**`, or a step with tests (one that lists `**Scenarios**` or `**Tests**` and carries no `**Closure criterion**`) that carries `**Files Affected**`.

#### Scenario: a plan with Required Documentation is in the earlier format

- **WHEN** `tasks.md` ends with a `## Required Documentation` section and `format` runs
- **THEN** it answers `earlier`, names `## Required Documentation` among its signals, exits 1, and writes nothing

#### Scenario: a step with tests that lists Files Affected is in the earlier format

- **WHEN** a step of `tasks.md` lists `**Scenarios**` and also `**Files Affected**`, and `format` runs
- **THEN** it answers `earlier` and names that step in its signals

#### Scenario: a plan in the current format

- **WHEN** every step with tests carries only its checkbox, `**Routing**`, `**Scenarios**`, `**Tests**`, and `**Test Command**`, every step without tests carries `**Files Affected**`, `**What Changes**`, and `**Closure criterion**`, and no `## Required Documentation` section exists
- **THEN** `format` answers `current` and exits 0

### Requirement: The writeback sub-command records the plan RED's test facts in tasks.md

The `writeback` sub-command of `sai/tools/file-manifest.js`, invoked as `node <tool-path> writeback <change-name> --input-file <accepted plan RED report> [--guard "<test path> :: <test name>"]... --json --cwd <project-root>`, SHALL read the report, require it to be a valid `implement` terminal report with status `completed` and a non-empty `plan_tests`, and write into each step with tests a `**Tests**` field (one `- <test path> :: <test name>` bullet per reported test, with ` [regression guard]` appended when the report flags `regression_guard: true` or a `--guard` value names that test) followed by `**Test Command**: <the step's test_command>`, placed after the step's `**Scenarios**` field. It SHALL replace any `**Tests**` and `**Test Command**` the step already carries, so a second run with the same report and the same `--guard` list reports `unchanged` and leaves `tasks.md` byte-identical. It SHALL write nothing and fail with exit 1 when `tasks.md` is in the earlier format, when the report lists a step twice, names a step that `tasks.md` lacks or that has no tests, or omits a step with tests, or when a `--guard` value names a test the report does not list. `--input-file` and `--guard` SHALL belong to `writeback` alone.

#### Scenario: the write-back adds tests and the test command

- **WHEN** Step 1 lists `**Scenarios**` and the accepted report lists two tests and a `test_command` for step 1, and `writeback` runs
- **THEN** Step 1 carries `**Tests**` with the two `- <path> :: <name>` bullets after its `**Scenarios**`, followed by `**Test Command**` with the reported command

#### Scenario: a coordinator-decided guard is marked

- **WHEN** `writeback` runs with `--guard "test/a.test.js :: keeps the old order"` and the report lists that test without a guard flag
- **THEN** its `**Tests**` bullet ends with ` [regression guard]`

#### Scenario: the write-back is idempotent

- **WHEN** `writeback` runs a second time with the same report and the same `--guard` list
- **THEN** it reports `unchanged` and leaves `tasks.md` byte-identical

#### Scenario: the report omits a step with tests

- **WHEN** Step 2 lists `**Scenarios**` and the report carries no `plan_tests` entry for step 2
- **THEN** `writeback` reports an error naming step 2, exits 1, and writes nothing

#### Scenario: an earlier-format plan is refused

- **WHEN** `tasks.md` carries `## Required Documentation` and `writeback` runs
- **THEN** it reports that `tasks.md` is in the earlier format, exits 1, and writes nothing
