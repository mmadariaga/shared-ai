# scenario-test-coverage Specification

## Purpose
TBD - created by archiving change scenario-test-coverage-check. Update Purpose after archive.

## Requirements

### Requirement: Scenario coverage tool modes and output

`sai/tools/scenario-coverage.js` SHALL offer two sub-commands, both accepting `--cwd <project-root>`: `step --input-file <path>`, whose input file holds a JSON list of non-empty scenario titles, and `change <change-name>`. Each SHALL print one JSON object with `verdict` (`clean`, `missing`, or `n/a`), `missing`, `ambiguous`, `parent_branch`, and `change_base`, and SHALL exit 0 for `clean` or `n/a`, 1 for `missing`, and 2 for a usage or I/O error. The verdict SHALL be `missing` whenever `missing` or `ambiguous` holds an entry. A step input with no titles SHALL give `n/a`.

#### Scenario: A title with no match is missing
- **WHEN** step mode receives a scenario title that appears in no file changed by the change
- **THEN** the tool lists that title under `missing`, prints the verdict `missing`, and exits 1

#### Scenario: A step with no titles
- **WHEN** step mode receives an empty JSON list
- **THEN** the tool prints the verdict `n/a` and exits 0

### Requirement: Scenarios match by normalized title in the files changed by the change

The tool SHALL count a scenario as covered when its normalized title (lowercased, punctuation removed, whitespace runs collapsed to one space) appears contiguously in the normalized content of a file changed by the change. The files changed by the change SHALL be the paths of `git diff --name-only <change base>`, plus staged changes and untracked files that are not ignored, where the change base is the merge-base of `HEAD` with the parent branch: the first of the default branch of `origin/HEAD` (without its `origin/` prefix), `master`, and `main` that `git rev-parse --verify` accepts. Files under `openspec/`, deleted files, and non-text files SHALL be excluded. A title found only in a comment or a non-test file SHALL count as covered.

#### Scenario: A title committed after the change base is covered
- **WHEN** a test file committed on the branch after the change base contains a scenario title with different case, punctuation, and spacing
- **THEN** the tool counts the scenario as covered

#### Scenario: Files outside the change do not cover a title
- **WHEN** a scenario title appears only in a file of the change base, an ignored file, a file under `openspec/`, a deleted file, or a binary file
- **THEN** the tool reports the scenario as missing

#### Scenario: The parent branch comes from origin HEAD
- **WHEN** `origin/HEAD` points to a remote branch whose local name verifies
- **THEN** the tool uses that branch name, without its `origin/` prefix, as `parent_branch`

### Requirement: Change mode checks only new or changed scenarios

Change mode SHALL check ADDED scenarios and MODIFIED or RENAMED scenarios whose title or body differs from the same scenario in `openspec/specs/<capability>/spec.md`, and SHALL skip an identical scenario. A scenario of a capability with no main spec SHALL count as new, and a scenario under a REMOVED requirement SHALL never be checked. A change with no scenario to check SHALL get `n/a`.

#### Scenario: An unchanged MODIFIED scenario is skipped
- **WHEN** a MODIFIED requirement repeats a scenario identical to the main spec and adds a new one
- **THEN** change mode checks only the new scenario

#### Scenario: A REMOVED requirement is not checked
- **WHEN** a delta spec removes a requirement with scenarios
- **THEN** change mode checks none of its scenarios

### Requirement: Scenarios that share a normalized title are ambiguous

Scenarios that share one normalized title SHALL be reported together as one `ambiguous` group and SHALL NOT be matched by any single test, in step mode and in change mode, including scenarios of different requirements.

#### Scenario: Two scenarios share a title
- **WHEN** two scenarios have titles that normalize to the same text
- **THEN** the tool reports them as one `ambiguous` group and prints the verdict `missing`

### Requirement: A change without specs gets an explicit n/a

Change mode SHALL answer `n/a` with no finding for a change whose `.openspec.yaml` sets `skip_specs: true`.

#### Scenario: A skip_specs change
- **WHEN** change mode runs for a change whose `.openspec.yaml` sets `skip_specs: true`
- **THEN** the tool prints the verdict `n/a` and exits 0

### Requirement: A tool failure is a usage or I/O error

A usage error, an unreadable input, a missing delta specs directory, or a git failure (including a directory that is not a git repository) SHALL exit 2 with a message on stderr and SHALL print no verdict.

#### Scenario: Not a git repository
- **WHEN** the tool runs in a directory that is not a git repository
- **THEN** it exits 2 with a message and prints no verdict

### Requirement: Scenario parsing is shared with the delta header check

The `#### Scenario:` parsing SHALL live in the shared module `sai/tools/spec-scenarios.js`, which both `scenario-coverage.js` and `check-delta-headers.js` require, and `check-delta-headers.js` SHALL keep its behavior and output unchanged.

#### Scenario: The delta header check uses the shared parser
- **WHEN** `check-delta-headers.js` runs on a change
- **THEN** it reads scenarios through `spec-scenarios.js` and prints the same result as before the move
