## Requirements

### Requirement: proposal.md carries a Complexity line

Every `proposal.md` emitted by `/sai-1-spec` SHALL carry exactly one `**Complexity**` line. The line SHALL have the form `**Complexity**: <complexity>`, where `<complexity>` is a single token from the closed vocabulary defined below.

The line is descriptive metadata. It SHALL NOT name a model, a vendor, a price tier, or a harness.

#### Scenario: Line is emitted on a new proposal

- **WHEN** `/sai-1-spec` finishes writing `proposal.md`
- **THEN** the file contains exactly one line matching `**Complexity**: <complexity>`
- **THEN** `<complexity>` is one of `low`, `medium`, `high`

#### Scenario: Line is vendor-neutral

- **WHEN** a reader inspects the emitted `**Complexity**` line
- **THEN** the line names no model, vendor, price tier, or harness
- **THEN** the token describes the size of the change only

### Requirement: Complexity vocabulary is a closed three-tier set

The `<complexity>` token SHALL be one of the following three values, and only these values:

- `low` — a single capability with few requirements; no breaking change; no new dependency; impact confined to one file or one documentation/config surface. A design pass can be completed in one short iteration.
- `medium` — a handful of capabilities or requirements, or impact spanning several files within one area; no breaking change and no new dependency. A design pass should budget an iteration or two.
- `high` — many capabilities or requirements, a breaking change, a new dependency, or impact spanning multiple subsystems. A design pass should budget multiple iterations and consider splitting the change.

The vocabulary is identical to the `complexity` token in `tasks.md`, so that a single token-to-model mapping table serves both artifacts. No token outside this set SHALL be emitted, and no new tier SHALL be introduced by this change.

`high` is the ceiling. When a change is genuinely larger than `high` — multi-repo coordination, or work that plainly warrants splitting — the emitting agent SHALL still emit `high` and SHALL NOT invent a fourth tier. The overflow SHALL be recorded as an Open Question in `design.md` during `/sai-2-design` so a future change can decide whether a further tier or a split-the-change rule is warranted.

#### Scenario: A token outside the vocabulary is rejected

- **WHEN** a proposal carries a `**Complexity**` value that is not `low`, `medium`, or `high`
- **THEN** the line is invalid
- **THEN** the emitting agent re-derives the token from the rubric rather than inventing a tier

#### Scenario: A change exceeds the top tier

- **WHEN** the rubric indicates the change is larger than the `high` tier describes
- **THEN** the emitted token is `high`
- **THEN** no fourth tier is invented
- **THEN** the overflow is recorded as an Open Question in `design.md` for a future change to resolve

#### Scenario: Vocabulary matches tasks.md

- **WHEN** a future orchestrator maps complexity tokens to models
- **THEN** the same mapping table applies to both the `proposal.md` `**Complexity**` line and the `tasks.md` `**Routing**` line's `complexity` token
- **THEN** no second mapping table is required

### Requirement: The Complexity line is the first line of proposal.md

The `**Complexity**` line SHALL be the first line of `proposal.md`, immediately preceding the `## Why` heading and separated from it by one blank line.

The canonical proposal template begins at `## Why` and carries no H1 title, so the top of the file is the anchor. No `##` section can precede the first one, which makes the position parser-stable: a parser reads the line before encountering any section boundary.

This invariant is a snapshot of the template's current shape. Any future change that introduces a preamble above `## Why` in the proposal template — a change-id block, a generated header, or similar — SHALL update this requirement in the same change rather than silently displacing the `**Complexity**` line.

#### Scenario: Position relative to the first heading

- **WHEN** `/sai-1-spec` emits `proposal.md`
- **THEN** the `**Complexity**` line is line 1 of the file
- **THEN** a blank line separates it from `## Why`
- **THEN** no `##` heading appears above it

#### Scenario: A future template preamble is introduced

- **WHEN** a later change adds any content above `## Why` in the proposal template
- **THEN** that change updates this requirement to re-anchor the `**Complexity**` line
- **THEN** the line is not silently displaced from its documented position

#### Scenario: Template carries the line

- **WHEN** the proposal template at `openspec/schemas/sai-workflow/templates/proposal.md` is read
- **THEN** the `**Complexity**` line appears above `## Why`
- **THEN** the emitting agent fills the token rather than adding the line structure itself

### Requirement: An optional parenthetical justification MAY follow the token

A trailing parenthetical one-line justification MAY follow the `<complexity>` token for audit purposes, for example `**Complexity**: medium (3 files, no breaking change)`. When present, the parenthetical begins with `(` and ends with `)`.

Any parser of the `**Complexity**` line SHALL ignore everything from the first `(` onward. Only the token is part of the routing signal.

#### Scenario: Justification present

- **WHEN** the line reads `**Complexity**: medium (3 files, no breaking change)`
- **THEN** a parser resolves the token as `medium`
- **THEN** the parenthetical text is ignored and carries no routing meaning

#### Scenario: Justification absent

- **WHEN** the line reads `**Complexity**: low`
- **THEN** the line is valid without a parenthetical
- **THEN** a parser resolves the token as `low`

### Requirement: The derivation rubric is static, planning-time, and reproducible

The rubric that derives `<complexity>` SHALL be encoded in `sai/instructions/spec.propose.md` under a section headed `## Complexity Derivation Rubric`, and SHALL depend only on signals available during the spec phase:

- the number of capabilities in the proposal's Capabilities section (new plus modified)
- the number of requirements across `specs/**/*.md` for this change
- whether the proposal marks any change **BREAKING**
- whether the change introduces a new dependency
- the number of distinct file paths named in the proposal's Impact section, counted only from paths the proposal lists as affected — paths the proposal lists as explicitly not touched SHALL NOT be counted

Because the Impact section is prose, the file-count signal SHALL be resolved by counting distinct literal paths rather than by interpreting narrative breadth, so that two agents reading the same Impact block reach the same count.

This spec defines the vocabulary, the signals, and the precedence rule. The numeric thresholds that map signal values to tiers live in the rubric section named above; a reader needs both to reproduce a token.

Tier selection SHALL use escalation precedence: the highest tier whose signals match wins. A second agent given the same proposal and the same rubric SHALL produce the same token.

The rubric SHALL NOT use path-pattern lookups, because `proposal.md` has no `**Files Affected**` field at this stage.

#### Scenario: Two agents derive the same token

- **WHEN** two agents independently apply the rubric to the same finished `proposal.md` and `specs/**`
- **THEN** both emit the same `<complexity>` token

#### Scenario: Escalation precedence resolves mixed signals

- **WHEN** a change has a single capability and two requirements but marks a change **BREAKING**
- **THEN** the breaking-change signal escalates the token to `high`
- **THEN** the low-tier signals do not lower it

#### Scenario: Impact paths are counted, not interpreted

- **WHEN** two agents derive the file-count signal from the same `## Impact` section
- **THEN** both count the same set of distinct literal paths listed as affected
- **THEN** neither counts paths the proposal lists as explicitly not touched

#### Scenario: No path-pattern lookup is used

- **WHEN** the rubric is applied
- **THEN** it reads only the proposal's own content and the change's specs
- **THEN** it performs no path-pattern classification of the kind used to derive the `layer` token in `tasks.md`

### Requirement: The token is finalized after the specs are written

Because the requirements count is one of the rubric signals, the `<complexity>` token SHALL be derived or revised after `specs/**/*.md` are written, before `/sai-1-spec` reports completion.

#### Scenario: Token reflects the finished specs

- **WHEN** `/sai-1-spec` has written `proposal.md` and all `specs/**/*.md`
- **THEN** the `**Complexity**` token accounts for the final requirements count
- **THEN** a token derived from an early draft is corrected before the step completes

### Requirement: Only complexity is carried at change level

The `proposal.md` metadata line SHALL carry the `complexity` signal alone. It SHALL NOT carry a `layer` token, a `discipline` token, or the full three-token `**Routing**` tuple used by `tasks.md`.

At change level, `layer` and `discipline` collapse to nearly-always `cross-cutting` and `mixed`, which adds noise without discrimination. `tasks.md` retains all three because per-step granularity gives each dimension real meaning.

#### Scenario: No Routing line on proposal.md

- **WHEN** a reader inspects an emitted `proposal.md`
- **THEN** no `**Routing**` line is present
- **THEN** only the `**Complexity**` line carries routing metadata

### Requirement: No consumer is built in this change

This change introduces the metadata only. It MUST NOT add a router, dispatcher, wrapper change, or any code or instruction that reads the `**Complexity**` line.

`sai/instructions/design.md` SHALL NOT read the token. The wrappers `commands/{claude,opencode,copilot}/sai-1-spec.*` and `commands/{claude,opencode,copilot}/sai-2-design.*` SHALL NOT be modified. Model selection stays fixed per harness. A future orchestrator MAY read the line, but building one is out of scope here.

#### Scenario: No complexity-aware code is added

- **WHEN** a reader searches the repository for code or instructions that consume `**Complexity**:` lines
- **THEN** no such consumer exists in this change
- **THEN** the metadata is present in `proposal.md` only, and no pipeline behavior depends on it yet

#### Scenario: Wrappers are untouched

- **WHEN** the diff for this change is inspected
- **THEN** no `sai-1-spec` or `sai-2-design` wrapper file appears in it
- **THEN** no model or frontmatter value is changed

### Requirement: The metadata surface is confined to proposal.md

This change SHALL NOT add a field to the per-change `.openspec.yaml`, SHALL NOT introduce YAML frontmatter on `proposal.md`, and SHALL NOT create any other new metadata surface.

#### Scenario: No new metadata surface

- **WHEN** the diff for this change is inspected
- **THEN** `.openspec.yaml` carries no new field
- **THEN** `proposal.md` carries no YAML frontmatter
- **THEN** the `**Complexity**` line is the only metadata added

### Requirement: Pre-existing and backfilled proposals are exempt

The `**Complexity**` line becomes mandatory only for `proposal.md` files emitted by `/sai-1-spec` after this change lands. Existing proposals SHALL NOT be re-tagged retroactively.

Proposals emitted by `/sai-backfill` are a distinct emit path and are outside this mandate; their post-hoc record blockquote remains the first line of those files.

#### Scenario: Archived proposals are exempt

- **WHEN** a reader inspects a `proposal.md` archived before this change
- **THEN** the absence of a `**Complexity**` line is not a violation
- **THEN** only proposals emitted by `/sai-1-spec` after this change are checked for the line

#### Scenario: Backfilled proposals are exempt

- **WHEN** `/sai-backfill` emits a post-hoc `proposal.md`
- **THEN** the absence of a `**Complexity**` line is not a violation
- **THEN** the post-hoc record blockquote remains the first line of that file

### Requirement: The token is a hint, not a contract

The `**Complexity**` token is a coarse planning-time judgment made before `design.md` and `tasks.md` exist, and MAY prove mis-sized once design begins.

`/sai-2-design` SHALL be free to size the work differently and to emit its own per-step `complexity` tokens in `tasks.md` without re-tagging `proposal.md`. A mismatch between the proposal token and the task tokens SHALL NOT be treated as an inconsistency.

#### Scenario: Design re-sizes the work

- **WHEN** `/sai-2-design` concludes the change is larger than the proposal token suggested
- **THEN** it proceeds with its own sizing
- **THEN** it does not rewrite the `**Complexity**` line in `proposal.md`
- **THEN** the divergence is not reported as a defect
