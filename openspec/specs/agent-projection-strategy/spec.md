# agent-projection-strategy Specification

## Purpose
Declares the install strategy contract for managed agent projections: each of the 17 managed agent projections (7 Claude + 10 opencode: the seven worker agents per harness plus the three opencode generic agents `explore`, `executor`, and `budget`) MUST declare exactly one `tunable-seed` strategy, the `owned-copy` strategy is retired from validation and dispatch, and `installProjection` routes `tunable-seed` to the dedicated installer.

## Requirements

### Requirement: agent projection strategy

The install manifest MUST declare exactly one strategy for each of the 17 managed agent projections (7 Claude + 10 opencode: the seven worker agents per harness plus the three opencode generic agents `explore`, `executor`, and `budget`), and that strategy MUST be named `tunable-seed`. The `owned-copy` strategy MUST NOT appear in any managed agent projection's `strategy` field.

#### Scenario: manifest declares 17 tunable-seed agent projections
- **WHEN** the install manifest is loaded
- **THEN** the `projections` array contains exactly 17 entries whose `destination.class` is `agents` and whose `strategy` is `tunable-seed`
- **AND** those 17 entries cover the seven `sai-{1,2,3,5,6,7,8}-*-worker.md` filenames on the Claude harness
- **AND** those 17 entries cover the same seven worker filenames on the opencode harness, plus the three generic agent filenames `explore.md`, `executor.md`, and `budget.md`

#### Scenario: no managed agent projection declares owned-copy
- **WHEN** the install manifest is loaded
- **THEN** no projection whose `destination.class` is `agents` has `strategy` equal to `owned-copy`

### Requirement: strategy validation set

The `STRATEGIES` validation set in `bin/install-manifest.js` MUST accept the literal string `tunable-seed` and MUST reject the literal string `owned-copy`. A rule whose `strategy` is not in the set is a manifest validation error.

#### Scenario: tunable-seed passes validation
- **WHEN** a projection rule is validated with `strategy: 'tunable-seed'`
- **THEN** `validateManifest` does not throw on the strategy field

#### Scenario: owned-copy fails validation
- **WHEN** a projection rule is validated with `strategy: 'owned-copy'`
- **THEN** `validateManifest` throws an error that names the projection id and the invalid strategy

### Requirement: install projection dispatch

The `installProjection` dispatch in `bin/install-flow.js` MUST route a `tunable-seed` projection to a dedicated installer function. The dispatcher MUST NOT alias `tunable-seed` onto the retired `owned-copy` handling. A projection whose `strategy` is `owned-copy` MUST cause the dispatcher to throw, because the strategy is retired, not aliased.

#### Scenario: tunable-seed routes to the dedicated installer
- **WHEN** `installProjection` is called with a projection whose `strategy` is `tunable-seed`
- **THEN** the dedicated `tunable-seed` installer runs against the projection's `sourcePath` and `destinationPath`

#### Scenario: owned-copy throws at dispatch
- **WHEN** `installProjection` is called with a projection whose `strategy` is `owned-copy`
- **THEN** the dispatcher throws an error that names the retired strategy
