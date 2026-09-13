# agent-tunable-ownership Specification

## Purpose
User-owned tunable frontmatter lines survive managed agent installs: `model` + `effort` for Claude, `model` + `variant` for opencode. A first install writes the source verbatim; later installs overwrite the body and non-tunable frontmatter with the source while splicing the destination's tunable values into the source frontmatter; extraction is textual (no YAML parser); uninstall identifies managed files by body comparison and treats tunable-only divergence as managed.
## Requirements
### Requirement: Claude tunable keys

The Claude installer MUST declare the user-owned tunable keys as exactly the two strings `model` and `effort`. The declaration MUST be a single per-harness constant, not a per-projection annotation; the 10 Claude agent projections MUST NOT carry any tunable-key metadata in the manifest.

#### Scenario: claude tunable set is model and effort
- **WHEN** the Claude installer's tunable-keys constant is read
- **THEN** it contains exactly the two keys `model` and `effort`

#### Scenario: no Claude projection carries tunable metadata
- **WHEN** each Claude agent projection rule in the manifest is inspected
- **THEN** no rule has any field that names a tunable key

### Requirement: opencode tunable keys

The opencode installer MUST declare the user-owned tunable keys as exactly the two strings `model` and `variant`. The declaration MUST be a single per-harness constant, not a per-projection annotation; the opencode agent projections declared by the manifest MUST NOT carry any tunable-key metadata.

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
The installer SHALL overwrite the destination agent file with source bytes verbatim on every global install when the destination exists, discarding any prior destination tunable values. The installer SHALL compare source and destination bytes exactly to decide overwritten versus reused and SHALL emit a console notice naming the destination whenever bytes differ. Non-tunable lines SHALL be replaced with source lines.
#### Scenario: body and non-tunable frontmatter are overwritten
- **WHEN** a destination exists with body or frontmatter differing from source including tunables
- **THEN** the destination matches source bytes verbatim after install
#### Scenario: source gains a non-tunable key, destination tunable lands in place
- **WHEN** the source contains a new non-tunable key that the destination lacks
- **THEN** the destination matches source bytes verbatim with the new key and no tunable landing occurs
#### Scenario: source loses a non-tunable key, destination tunable lands in place
- **WHEN** the source omits a non-tunable key that the destination holds
- **THEN** the destination matches source bytes verbatim without the missing key and no tunable landing occurs
#### Scenario: destination tunable is never emitted inside permission block
- **WHEN** the destination is an opencode agent file with a nested permission block
- **THEN** no tunable line appears inside the permission block because nothing is preserved and the destination matches source verbatim
#### Scenario: tunable lines appear in source order with destination values
- **WHEN** a destination lists tunable keys in an order different from the source
- **THEN** the destination matches source order and source values verbatim after install
#### Scenario: a destination tunable with no source counterpart is preserved
- **WHEN** a destination contains a tunable key that the source omits
- **THEN** the destination matches source bytes verbatim and the destination-only tunable is discarded
#### Scenario: an absent tunable stays absent
- **WHEN** a destination is missing a tunable key
- **THEN** the destination matches source bytes verbatim so the key stays absent only when the source omits it
#### Scenario: a non-tunable destination line is overwritten
- **WHEN** a destination contains a non-tunable line differing from source
- **THEN** the installer replaces that line with the source line verbatim
#### Scenario: global reinstall overwrites customized models
- **WHEN** a global destination exists with tuned model or effort values differing from source
- **THEN** the installer writes the source bytes verbatim and reports overwritten

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

#### Scenario: opencode uninstall enumerates manifest-declared agent files
- **WHEN** uninstall builds its deletion set for the opencode harness
- **THEN** it enumerates exactly the opencode managed agent destinations declared by the manifest
- **AND** it does not enumerate `.<basename>.owner.json` files as separate deletion targets

