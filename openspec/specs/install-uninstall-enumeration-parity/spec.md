# install-uninstall-enumeration-parity Specification

## Purpose
TBD: define the shared neutral worker-binding destination graph and safe retirement behavior.

## Requirements

### Requirement: Installation and inventory operations share the neutral destination graph
Manifest expansion, installation, uninstall enumeration, deletion planning, and drift comparison SHALL derive the same neutral worker-binding destinations from the manifest without requiring a separate harness-specific destination rule.

#### Scenario: Installation and uninstall enumerate matching neutral paths
- **WHEN** the manifest is expanded for Claude Code or opencode and an uninstall inventory is generated
- **THEN** both operations SHALL identify the same `orchestration/workers/bindings/<worker-filename>.md` destinations, preserving each of the seven existing worker filenames

#### Scenario: Legacy identity paths are not active destinations
- **WHEN** the current manifest is used to build an install, uninstall, or drift inventory
- **THEN** `orchestration/workers/bindings/claude/<worker-filename>.md` and `orchestration/workers/bindings/opencode/<worker-filename>.md` SHALL not be enumerated as current projection destinations; they SHALL be handled only through the retirement inventory

### Requirement: Neutral projections preserve installer safety properties
Neutral worker-binding projections SHALL preserve deterministic ordering, collision detection, source-content hashing, foreign-binding exclusion, and the existing Copilot absence of routed worker projections.

#### Scenario: Repeated expansion is deterministic
- **WHEN** the same harness manifest is expanded more than once
- **THEN** the neutral binding entries SHALL have stable ordering and identical source and destination pairs

#### Scenario: Edited managed content remains detectable
- **WHEN** a managed neutral binding file differs from its expected source content
- **THEN** the existing drift mechanism SHALL report the content mismatch without changing the destination shape

### Requirement: Legacy harness-qualified destinations are retired safely
The manifest SHALL declare all 14 legacy Claude Code and opencode destinations, one for each harness and each existing worker filename, as retirement entries with a `managedHashes` array containing the distinct set of every SHA-256 digest for each previously shipped version of that binding file. The set SHALL be derived from prior shipped manifests and source revisions that produced the legacy destination, including predecessor worker-split versions, rather than from only the current source hash. The retirement process SHALL remove a legacy file only when its content matches any digest in the `managedHashes` array and SHALL protect edited legacy content according to the existing retirement behavior.

#### Scenario: Matching legacy content is retired during upgrade
- **WHEN** an old harness-qualified worker-binding file exists with content matching one of the managed hashes recorded by its retirement entry
- **THEN** the upgrade or uninstall retirement process SHALL remove that legacy file when its content matches any digest in the retirement entry's `managedHashes` array and record the retirement outcome

#### Scenario: Edited legacy content is protected
- **WHEN** an old harness-qualified worker-binding file differs from every digest in its retirement entry's `managedHashes` array
- **THEN** the retirement process SHALL not delete the edited file and SHALL report the managed-hash mismatch according to existing retirement behavior
