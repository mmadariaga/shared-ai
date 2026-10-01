# agent-projection-strategy Specification

## Purpose
Declares the install strategy contract for managed agent projections: each of the 20 managed agent projections (10 Claude + 10 opencode: the seven worker agents per harness plus the three generic agents per harness — the opencode trio `explore`, `executor`, `budget` and the Claude trio `budget-explorer`, `budget-executor`, `budget-subagent`) MUST declare exactly one `tunable-seed` strategy, the `owned-copy` strategy is retired from validation and dispatch, and `installProjection` routes `tunable-seed` to the dedicated installer.

## Requirements

### Requirement: Install manifest declares tunable-seed strategy for each of the 20 managed agent projections

The manifest MUST declare exactly one tunable-seed strategy for every current managed agent projection. Inventory SHALL derive from the current worker matrix and Generic Agent projections, not the historical count embedded in this requirement's name. It SHALL include all current managed workers in both harnesses, the Claude Generic Agents budget-explorer, budget-executor, and budget-subagent, and the opencode Generic Agents explore, executor, and budget. No managed agent projection SHALL declare owned-copy.

#### Scenario: manifest declares 20 tunable-seed agent projections
- **WHEN** managed agent projections are enumerated from the manifest and worker matrix
- **THEN** every current managed worker and Generic Agent has exactly one agents destination using tunable-seed for each supported harness
- **AND** both sets of three Generic Agent filenames remain included

#### Scenario: no managed agent projection declares owned-copy
- **WHEN** the install manifest is loaded
- **THEN** no projection whose destination class is agents has strategy owned-copy

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
