# agent-tunable-ownership Specification

## Purpose
User-owned tunable frontmatter lines survive managed agent installs: `model` + `effort` for Claude, `model` + `variant` for opencode. A first install writes the source verbatim; later installs overwrite the body and non-tunable frontmatter with the source while splicing the destination's tunable values into the source frontmatter; extraction is textual (no YAML parser); uninstall identifies managed files by body comparison and treats tunable-only divergence as managed.

## Requirements

### Requirement: Claude tunable keys

The Claude installer MUST declare the user-owned tunable keys as exactly the two strings `model` and `effort`. The declaration MUST be a single per-harness constant, not a per-projection annotation; the 7 Claude agent projections MUST NOT carry any tunable-key metadata in the manifest.

#### Scenario: claude tunable set is model and effort
- **WHEN** the Claude installer's tunable-keys constant is read
- **THEN** it contains exactly the strings `model` and `effort` and no others

#### Scenario: no Claude projection carries tunable metadata
- **WHEN** the install manifest is loaded
- **THEN** no Claude agent projection rule has any field that names a tunable key

### Requirement: opencode tunable keys

The opencode installer MUST declare the user-owned tunable keys as exactly the two strings `model` and `variant`. The declaration MUST be a single per-harness constant, not a per-projection annotation; the 7 opencode agent projections MUST NOT carry any tunable-key metadata in the manifest.

#### Scenario: opencode tunable set is model and variant
- **WHEN** the opencode installer's tunable-keys constant is read
- **THEN** it contains exactly the strings `model` and `variant` and no others

#### Scenario: no opencode projection carries tunable metadata
- **WHEN** the install manifest is loaded
- **THEN** no opencode agent projection rule has any field that names a tunable key

### Requirement: seed on create

When the destination agent file does not exist, the installer MUST write the source file's bytes to the destination verbatim. The shipped tunable values present in the source MUST be the user's first tunable values; no re-seeding of tunable values occurs at any later install.

#### Scenario: first install writes source verbatim
- **WHEN** the destination agent file does not exist
- **THEN** the installer writes the source bytes to the destination unchanged
- **AND** the destination's tunable lines are the source's tunable lines in source order

### Requirement: overwrite managed on update

When the destination agent file exists, the installer MUST overwrite the body and non-tunable frontmatter with the source bytes, and MUST preserve the destination's tunable scalar lines. Preservation MUST use a structural anchor, not a positional index, so the result is well-formed regardless of how the source's frontmatter shape changed relative to the destination. The algorithm MUST be:

    1. Parse the source into the body and the frontmatter block bounded by the first two `---` lines.
    2. For each tunable key in the harness tunable set:
       a. If the source frontmatter contains a top-level `^<key>:\s*<value>$` line, replace that line's value in place with the destination's value for the same key. The line stays at the source's position.
       b. If the source frontmatter does not contain the key, append a new top-level `^<key>:\s*<value>$` line carrying the destination's value immediately after the last top-level scalar in the source frontmatter and BEFORE the first nested block. If the source has no top-level scalar, the line is appended at the start of the frontmatter body.
    3. Tunable lines SHALL NOT be emitted inside any nested block. In particular, no tunable line SHALL appear between a top-level scalar and the first nested key under a block such as `permission:`.
    4. Tunable lines for keys not in the harness set SHALL NOT be preserved as if they were tunables; they are part of the non-tunable frontmatter and are overwritten with the source.

The textual extraction that supplies the destination values, the block-boundary detection that anchors placement, and the rule that the block's contents are never interpreted or rewritten are governed by the dedicated `tunable extraction is textual` requirement.

#### Scenario: body and non-tunable frontmatter are overwritten
- **WHEN** the destination exists and its body or non-tunable frontmatter differs from source
- **THEN** the destination's body and non-tunable frontmatter match the source after the install
- **AND** the destination's tunable lines retain the values they held before the install

#### Scenario: source gains a non-tunable key, destination tunable lands in place
- **WHEN** the source frontmatter contains a new non-tunable key `description_priority` that the destination does not have
- **AND** the destination contains a tunable line `model: <user-value>` that the source does not have
- **THEN** after the install, the destination's frontmatter contains the source's `description_priority` line
- **AND** a `model: <user-value>` top-level line is appended immediately after the last top-level scalar and BEFORE the first nested block
- **AND** no `model:` line appears inside any nested block

#### Scenario: source loses a non-tunable key, destination tunable lands in place
- **WHEN** the source frontmatter omits a non-tunable key that the destination has
- **AND** the destination contains a tunable line `effort: <user-value>` that the source does not have
- **THEN** after the install, the destination's frontmatter no longer contains the missing non-tunable key
- **AND** a `effort: <user-value>` top-level line is appended immediately after the last top-level scalar and BEFORE the first nested block

#### Scenario: destination tunable is never emitted inside permission block
- **WHEN** the destination is an opencode agent file and the source frontmatter ends with a nested `permission:` block
- **AND** the destination contains a tunable line `model: <user-value>` that the source does not have
- **THEN** after the install, the `model:` line is a top-level line above the `permission:` block
- **AND** no `model:` line appears between `permission:` and its nested keys

#### Scenario: tunable lines appear in source order with destination values
- **WHEN** the destination exists and lists its tunable keys in an order different from the source
- **THEN** after the install, the destination's tunable lines appear in the same order as the source's tunable lines
- **AND** each line carries the value the destination held before the install

#### Scenario: a destination tunable with no source counterpart is preserved
- **WHEN** the destination contains a tunable line whose key is in the harness tunable set but the source does not declare that key
- **THEN** after the install, that destination tunable line is still present in the destination
- **AND** the install does not remove it

#### Scenario: an absent tunable stays absent
- **WHEN** the destination exists and is missing one of the declared tunable keys
- **THEN** after the install, the destination is still missing that tunable key
- **AND** the install does not re-seed the missing key from the source

#### Scenario: a non-tunable destination line is overwritten
- **WHEN** the destination contains a line whose key is not in the harness tunable set
- **THEN** after the install, that line is replaced with the corresponding line from the source

### Requirement: tunable extraction is textual

The installer MUST extract destination tunable values by matching the textual pattern `^<key>:\s*<value>$` against the frontmatter block bounded by the first two `---` lines. The installer MUST NOT introduce a YAML parsing dependency for this purpose. To anchor placement of a preserved tunable above a nested block, the installer MAY detect the first indented line after a top-level scalar as the start of that block; the installer's only interaction with the nested `permission:` block on opencode agents is this boundary detection. The block's keys, values, and indentation MUST NOT otherwise be interpreted or rewritten; the block is overwritten verbatim from the source.

#### Scenario: extraction does not require a YAML library
- **WHEN** the installer's source is read
- **THEN** the extraction code path does not import or require any YAML parser

#### Scenario: block boundary is detected but block contents are not parsed
- **WHEN** the destination is an opencode agent file containing a nested `permission:` block
- **THEN** the installer detects the first indented line after a top-level scalar to identify the block's start
- **AND** the block's keys, values, and indentation are not interpreted or rewritten
- **AND** the block in the destination is replaced with the block from the source verbatim

### Requirement: uninstall uses body comparison to identify managed files

The uninstall flow SHALL identify a managed agent file as matching its shipped content by comparing only the body and non-tunable frontmatter of the destination against the source, using the same tunable-set declaration the installer uses. The uninstall flow SHALL delete the destination agent file only when this comparison matches; a destination whose body and non-tunable frontmatter match the source but whose tunable lines differ from the source SHALL also be considered matching. The uninstall flow SHALL NOT read or compare `.<basename>.owner.json` sidecar files to make this keep-vs-delete decision. A destination whose body or non-tunable frontmatter differs from source is a project-local override and SHALL be kept. Sidecar removal alongside an uninstalled agent file is governed by the `uninstall also removes sidecars under the shape guard` requirement in `agent-sidecar-removal`, not restated here.

#### Scenario: tuned destination is recognized as managed
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source and whose tunable lines differ from the source
- **THEN** uninstall SHALL delete the destination agent file
- **AND** SHALL NOT consult any sidecar file to decide keep-vs-delete

#### Scenario: divergent body is kept as override
- **WHEN** uninstall evaluates a destination whose body or non-tunable frontmatter differs from the source
- **THEN** uninstall SHALL keep the destination as a project-local override
- **AND** SHALL emit the existing `Kept (project-local override)` warning

#### Scenario: Claude uninstall enumerates 7 Claude agent files
- **WHEN** uninstall builds its deletion set for the Claude harness
- **THEN** it enumerates exactly the 7 Claude managed agent destinations declared by the manifest
- **AND** it does not enumerate `.<basename>.owner.json` files as separate deletion targets

#### Scenario: opencode uninstall enumerates 7 opencode agent files
- **WHEN** uninstall builds its deletion set for the opencode harness
- **THEN** it enumerates exactly the 7 opencode managed agent destinations declared by the manifest
- **AND** it does not enumerate `.<basename>.owner.json` files as separate deletion targets
