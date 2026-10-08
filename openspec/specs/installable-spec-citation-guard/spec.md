# installable-spec-citation-guard Specification

## Purpose
Stop a citation of a shared-ai capability spec from returning to the installable files. A regression test scans the installable source folders and fails, naming the file and line, when it finds such a citation.

## Requirements

### Requirement: A regression test fails on an own-spec citation in an installable file

`test/installable-spec-citations.test.js` SHALL fail when any installable file contains an own-spec citation in one of two forms: a `specs/<name>/` path whose `<name>` is a capability directory of shared-ai's `openspec/specs/`, with or without the `openspec/` prefix, or a backticked capability name followed by the word `capability` or `spec`. Each failure SHALL report the file path, the line number, the form, and the capability name.

#### Scenario: A path citation fails the test

- **WHEN** an installable file contains `openspec/specs/<name>/spec.md` or the relative `specs/<name>/spec.md`, where `<name>` is a real capability directory
- **THEN** the test fails and reports that file, the line, the path form, and `<name>`

#### Scenario: A name citation fails the test

- **WHEN** an installable file contains a backticked real capability name directly followed by the word `capability` or `spec`
- **THEN** the test fails and reports that file, the line, the name form, and the capability name

#### Scenario: A clean tree passes

- **WHEN** no installable file contains either form
- **THEN** the test passes

### Requirement: The guard takes capability names from the live spec directories

The guard SHALL derive the set of capability names from the directory names directly under `openspec/specs/`, excluding `_archived`, at test time. It SHALL NOT carry a hard-coded capability list, and it SHALL fail when that set is empty.

#### Scenario: A newly added capability is covered

- **WHEN** a new directory is added under `openspec/specs/`
- **THEN** a citation of that capability in an installable file fails the test with no change to the test

### Requirement: The guard scans only the installable source folders

The guard SHALL walk exactly these folders recursively: `sai`, `skills`, `agents`, `commands`, and `openspec/schemas/sai-workflow`. It SHALL NOT scan `docs/`, `test/`, `openspec/changes/`, `openspec/specs/`, or installed copies under `.claude/` or `.opencode/`.

#### Scenario: A historical record citing a spec path is not flagged

- **WHEN** an archived change, an ADR, or a DDR contains a path into `openspec/specs/`
- **THEN** the test does not report it

### Requirement: The guard does not flag target-project references or bare names

The guard SHALL NOT report a generic placeholder path (`openspec/specs/{name}/spec.md`, `specs/<capability>/spec.md`, `openspec/specs/**`), a bare capability name written without the word `capability` or `spec`, or a backticked name that is not a real capability directory. Bare names stay unchecked because many coincide with policy, command, and stage names.

#### Scenario: A placeholder path is not flagged

- **WHEN** an installable file contains `openspec/specs/{name}/spec.md` or `specs/<capability>/spec.md`
- **THEN** the test reports nothing for that line

#### Scenario: A policy that shares a capability name is not flagged

- **WHEN** an installable file contains `Fetch @sai/policies/commit-rules.md` or the bare words `commit-rules`, and `commit-rules` is also a capability directory
- **THEN** the test reports nothing for that line
