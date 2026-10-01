# agent-tunable-ownership Specification

## Purpose
User-owned tunable frontmatter lines survive managed agent installs: `model` + `effort` for Claude, `model` + `variant` for opencode. A first install writes the source verbatim; later installs overwrite the body and non-tunable frontmatter with the source while splicing the destination's tunable values into the source frontmatter; extraction is textual (no YAML parser); uninstall identifies managed files by body comparison and treats tunable-only divergence as managed.

## Requirements

### Requirement: Claude tunable keys

The Claude installer MUST declare user-owned tunable keys as exactly model and effort through one per-harness constant rather than per-projection annotations. Current Claude agent projections MUST NOT carry tunable-key metadata in the manifest.

#### Scenario: claude tunable set is model and effort
- **WHEN** the Claude installer's tunable-keys constant is read
- **THEN** it contains exactly model and effort

#### Scenario: no Claude projection carries tunable metadata
- **WHEN** each Claude agent projection rule is inspected
- **THEN** no rule has a field naming a tunable key

### Requirement: opencode tunable keys

The opencode installer MUST declare the user-owned tunable keys as exactly the two strings `model` and `variant`. The declaration MUST be a single per-harness constant, not a per-projection annotation; the opencode agent projections declared by the manifest MUST NOT carry any tunable-key metadata.

#### Scenario: opencode tunable set is model and variant
- **WHEN** the opencode installer's tunable-keys constant is read
- **THEN** it contains exactly the strings `model` and `variant` and no others

#### Scenario: no opencode projection carries tunable metadata
- **WHEN** the install manifest is loaded
- **THEN** no opencode agent projection rule has any field that names a tunable key

### Requirement: seed on create

When an agent destination does not exist, the installer MUST write the projection's source bytes verbatim, using compiled sourceText when the projection supplies it. Source tunable seeds MUST become the first destination tunables without later re-seeding. Capability projection SHALL resolve placeholders before installation.

#### Scenario: first install writes source verbatim
- **WHEN** the destination agent file does not exist
- **THEN** installation writes compiled source bytes unchanged
- **AND** destination tunables retain source values in source order

### Requirement: overwrite managed on update

The installer SHALL compare only body and non-tunable frontmatter, excluding harness-declared tunable blocks, to decide overwritten versus reused. Compatible destinations SHALL remain untouched without an overwrite notice. For divergent managed content, the installer SHALL replace body and non-tunable frontmatter with compiled source content, preserve destination tunable blocks, and emit a notice naming the destination. Preserved keys SHALL be inserted at a top-level structural anchor in harness key order, outside permission blocks. Destination-only tunables SHALL survive and absent optional tunables SHALL stay absent.

#### Scenario: body and non-tunable frontmatter are overwritten
- **WHEN** a destination exists with body or non-tunable frontmatter differing from compiled source
- **THEN** managed content matches compiled source after installation while destination tunables are preserved

#### Scenario: source gains a non-tunable key, destination tunable lands in place
- **WHEN** source contains a new non-tunable key absent from destination
- **THEN** installation adds the source key and preserves destination tunables at the top-level structural anchor

#### Scenario: source loses a non-tunable key, destination tunable lands in place
- **WHEN** source omits a non-tunable key held by destination
- **THEN** installation removes that stale managed key while preserving destination tunables

#### Scenario: destination tunable is never emitted inside permission block
- **WHEN** an opencode destination contains a nested permission block
- **THEN** preserved model and variant blocks remain top-level rather than appearing inside generated permissions

#### Scenario: tunable lines appear in source order with destination values
- **WHEN** an update is required and destination tunables appear in a different order
- **THEN** preserved destination values are emitted at the source tunable anchor in the harness-declared key order

#### Scenario: a destination tunable with no source counterpart is preserved
- **WHEN** destination contains a tunable key omitted by source and managed content needs updating
- **THEN** the destination-only tunable is retained outside nested blocks

#### Scenario: an absent tunable stays absent
- **WHEN** destination omits an optional tunable present in source
- **THEN** a managed update does not reintroduce that optional tunable

#### Scenario: a non-tunable destination line is overwritten
- **WHEN** destination contains a non-tunable line differing from source
- **THEN** installation replaces that line with the source line verbatim

#### Scenario: global reinstall overwrites customized models
- **WHEN** a global destination has tuned model or effort values and managed content differs
- **THEN** installation updates managed content with a notice while preserving customized model and effort values instead of resetting them

#### Scenario: Tunable-only differences are quietly reused
- **WHEN** body and non-tunable frontmatter match source but tunables differ
- **THEN** installation leaves the complete destination untouched without an overwrite notice

### Requirement: tunable extraction is textual

The installer MUST extract destination tunable text from frontmatter bounded by the first two delimiter lines without a YAML parser dependency. Extraction SHALL recognize top-level key lines and retain each tunable's associated textual block, supporting scalar and structured model values. Nested permission block boundaries MAY be detected structurally; permission keys, values, and indentation SHALL NOT be interpreted or rewritten through tunable extraction. On a managed update, non-tunable blocks SHALL come from compiled source. Supported line endings SHALL be normalized for identity comparison.

#### Scenario: extraction does not require a YAML library
- **WHEN** installer source is inspected
- **THEN** the extraction path imports or requires no YAML parser

#### Scenario: block boundary is detected but block contents are not parsed
- **WHEN** an opencode destination contains a nested permissions block
- **THEN** textual top-level boundaries separate that non-tunable block from model and variant blocks
- **AND** permission keys, values, and indentation are not parsed or rewritten by extraction
- **AND** a managed update replaces the permissions block with compiled source content

#### Scenario: Structured model survives an update
- **WHEN** an opencode destination has providerID and id nested under model
- **THEN** a managed update preserves that complete model block and its separate destination variant

### Requirement: uninstall uses body comparison to identify managed files

Uninstall SHALL identify matching managed agents by comparing destination body and non-tunable frontmatter against compiled source using the same harness tunable set as installation. It SHALL delete an agent only when this comparison matches; tunable-only divergence SHALL still count as matching. Uninstall SHALL NOT consult ownership sidecars for keep-versus-delete identity. Divergent body or non-tunable frontmatter SHALL be kept as a project-local override with the existing warning. Sidecar removal SHALL remain governed by the existing agent-sidecar-removal shape-guard requirement. Enumeration SHALL use the current manifest-derived inventory rather than historical fixed counts.

#### Scenario: tuned destination is recognized as managed
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match compiled source but tunables differ
- **THEN** it deletes the matching managed agent
- **AND** it consults no sidecar for the identity decision

#### Scenario: divergent body is kept as override
- **WHEN** destination body or non-tunable frontmatter differs from compiled source
- **THEN** uninstall keeps it as a project-local override
- **AND** it emits the existing Kept (project-local override) warning

#### Scenario: Claude uninstall enumerates 7 Claude agent files
- **WHEN** uninstall builds the Claude deletion set
- **THEN** it enumerates all current manifest-derived Claude managed agent destinations rather than the historical seven-file count
- **AND** it does not enumerate ownership sidecars as separate targets

#### Scenario: opencode uninstall enumerates manifest-declared agent files
- **WHEN** uninstall builds the opencode deletion set
- **THEN** it enumerates exactly the current manifest-derived opencode managed agent destinations
- **AND** it does not enumerate ownership sidecars as separate targets

### Requirement: Doctor accepts tunable-only agent differences

Doctor SHALL compare compiled managed agent content using the body-and-non-tunable identity rule. User-owned tunable differences SHALL NOT be reported as managed-content drift.

#### Scenario: Tuned agent passes identity inspection
- **WHEN** doctor inspects an agent whose only differences are model or effort or variant settings
- **THEN** its managed-content identity check reports compatible content
