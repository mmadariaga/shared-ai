# design-target-state Specification

## Requirements

### Requirement: interfaces.md opens with a Target State section

`sai/instructions/design.md` SHALL require that `openspec/changes/{name}/interfaces.md` begins with a `## Target State` section, emitted before the first `## Step N` section.

`## Target State` SHALL present the finished shape the change converges on as **one concrete artifact** — not a per-step narrative and not a restatement of the change's motivation.

"Finished shape" SHALL be interpreted according to what the change produces:

- For code changes — the resulting payload, public signature, schema, file layout, or config shape as it will exist after the last step.
- For prose, instruction, or documentation changes — the resulting section and field structure of each document the change touches, as it will read after the last step.

The section SHALL be written so a reader who reads only `## Target State` knows what the repository looks like when the change is complete, without reading any `## Step N` section.

When a change genuinely produces no finished shape expressible under either interpretation, `## Target State` SHALL still be emitted with an explicit `None` and a one-line reason, matching the `None` provisions of `design-manual-verification` and `design-deferred-decisions`. Silent omission of the section SHALL NOT occur.

#### Scenario: Target State precedes all step sections

- **WHEN** `sai-2-design` generates `interfaces.md` for a change
- **THEN** the file's first section is `## Target State`
- **AND** every `## Step N` section appears after it

#### Scenario: Target State is one concrete artifact, not a step walkthrough

- **WHEN** a change modifies a public function signature and the schema it serializes
- **THEN** `## Target State` shows the final signature and the final schema as they will exist after the last step
- **AND** it does NOT describe the intermediate shapes each step produces

#### Scenario: prose change states its finished document structure

- **WHEN** a change modifies instruction or documentation files rather than code
- **THEN** `## Target State` shows the resulting section and field structure of each document the change touches, as it will read after the last step
- **AND** the section is NOT omitted on the grounds that no payload, signature, or schema is involved

#### Scenario: no expressible finished shape

- **WHEN** a change produces no finished shape under either interpretation
- **THEN** `## Target State` is emitted with `None` and a one-line reason
- **AND** the section is NOT silently omitted

#### Scenario: Target State is readable without the step sections

- **WHEN** a reader reads `## Target State` alone
- **THEN** the finished shape is fully determined from that section
- **AND** no `## Step N` section is required to interpret it

### Requirement: Target State does not replace or duplicate per-step interfaces

`## Target State` SHALL NOT remove the obligation to emit per-step `## Interfaces` and `## Test assertions` content for each step that introduces an interface surface. The per-step sections remain the authoritative record of *which step* introduces *which* signature; `## Target State` is the destination view.

Where a signature appears in both `## Target State` and a `## Step N` section, the `## Step N` section SHALL remain the authority on step attribution.

#### Scenario: per-step sections still emitted alongside Target State

- **WHEN** `interfaces.md` contains a `## Target State` section
- **THEN** each step that introduces a new or modified public interface still has its own `## Step N` section with Interfaces and Test assertions parts

#### Scenario: steps with no interface surface remain omitted

- **WHEN** a step introduces neither a new/modified public interface nor a testable assertion
- **THEN** that step is still omitted from `interfaces.md` entirely
- **AND** the presence of `## Target State` does not cause an empty `## Step N` section to be emitted for it
