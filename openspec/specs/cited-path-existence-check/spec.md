# cited-path-existence-check Specification

## Purpose
TBD - created by archiving change cited-path-existence-check. Update Purpose after archive.

## Requirements

### Requirement: Cited-path checker validates designated sections with mode-specific existence semantics
The checker SHALL extract cited paths from designated sections only (`Local files`, `Files Affected` with `A`/`M`/`D`/`R` prefixes, `Precise file locations`, `interfaces.md` test-assertion paths) and report unresolvable out-of-root paths and URLs without checking disk. In `sai-1` mode every extracted path SHALL exist; in `sai-2` mode `A` paths MAY be absent while every `M`/`D`/`R` and unprefixed evidence path SHALL exist. Separators SHALL be normalized and resolution SHALL be relative to the repository root, with `specs/` and bare `proposal.md` shorthand resolving inside the change directory. On a miss the checker SHALL suggest up to three same-basename candidates and SHALL never rewrite any artifact.

#### Scenario: Hallucinated evidence path fails fast
- **WHEN** `proposal.md` cites a non-existent evidence path and the checker runs in `sai-1` mode
- **THEN** the checker exits 1 reporting `EVIDENCE_PATH_MISSING` with a basename suggestion and no file is modified

### Requirement: Rename citations enforce origin existence
For a rename citation (`R <src> -> <dst>`) the checker SHALL require the origin to exist while the destination MAY be absent, and SHALL report `RENAME_ORIGIN_MISSING` when the origin is absent.

#### Scenario: Rename with missing origin is rejected
- **WHEN** a `Files Affected` rename cites a non-existent origin
- **THEN** the checker reports the origin violation with candidates and exits 1 without writing

### Requirement: Spec validation gate blocks on missing evidence paths
The `sai-1` validation step SHALL resolve `check-cited-paths.js` by the first existing candidate verbatim and run `node <tool> sai-1 <change-name> --cwd <project-root>` before completion. A non-zero exit SHALL block completion until every cited evidence path in `proposal.md` and `specs/**` exists.

#### Scenario: Spec step with bad evidence path cannot complete
- **WHEN** the `sai-1` gate reports a missing evidence path
- **THEN** the worker fixes the cited entries using suggestions only and re-runs until exit 0

### Requirement: Design interfaces gate blocks on missing planned paths
The `sai-2` interfaces step SHALL run `node <tool> sai-2 <change-name> --cwd <project-root>` after `interfaces.md` verifies and before the `interfaces` progress event, resolving the tool by the same first-candidate rule. A non-zero exit SHALL block until every `M`/`D`/`R` path in `tasks.md` and every path in `interfaces.md` exists.

#### Scenario: Design plan with missing modified path cannot advance
- **WHEN** `tasks.md` lists an `M` path that does not exist on disk
- **THEN** the gate blocks the progress event until the entry is corrected and the checker passes

### Requirement: Review-loop report mode maps violations to High findings
For every `sai-1` and `sai-2` review transaction the `review-loop` Review Engine SHALL run the same binary read-only as `node <tool> <sai-1|sai-2> <change-name> --findings --cwd <project-root>` and append each reported violation as a `High` finding with its `Artifact location`. A clean report SHALL contribute no findings.

#### Scenario: Review surfaces a hallucinated planned path as High
- **WHEN** a reviewed change cites a non-existent planned path
- **THEN** the review appends one `High` finding per violation and closes with the updated tally without writing any file
