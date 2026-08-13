# design-target-state Specification

## Requirements

### Requirement: design.md opens with a Target State section

`openspec/changes/{name}/design.md` SHALL begin with a `## Target State` section, authored and persisted by the design phase as the authoritative source for the change's finished-shape snapshot. `sai/commands/design/instructions.md` SHALL require that the `## Target State` section is emitted in `design.md` before the other design sections, and SHALL require that `openspec/changes/{name}/interfaces.md` begins directly with its first `## Step N` section — no `## Target State` section and no snapshot or manifest subsection SHALL be emitted in `interfaces.md`. The `change-overview.md` projection SHALL read the authoritative snapshot details from `design.md`; it SHALL render them under an adapted approval-oriented `## Target Architecture` section rather than project `## Target State`, and SHALL NOT author or synthesize source snapshot facts independently. The overview renders an adapted ## Target Architecture rather than ## Target State.

`## Target State` SHALL present the finished shape the change converges on as **one concrete artifact** — not a per-step narrative and not a restatement of the change's motivation.

"Finished shape" SHALL be interpreted according to what the change produces:

- For code changes — the resulting payload, public signature, schema, file layout, or config shape as it will exist after the last step.
- For prose, instruction, or documentation changes — the resulting section and field structure of each document the change touches, as it will read after the last step.

The section SHALL be written so a reader who reads only `## Target State` knows what the repository looks like when the change is complete, without reading any `## Step N` section.

When a change genuinely produces no finished shape expressible under either interpretation, `## Target State` SHALL still be emitted with an explicit `None` and a one-line reason, matching the `None` provisions of `design-manual-verification` and `design-deferred-decisions`. Silent omission of the section SHALL NOT occur.

Directly beneath `## Target State`, `design.md` SHALL emit exactly the subsections required by the `Target State subsections remain exact in design.md only` requirement of the `change-overview-artifact` capability — the named subsection rule: `### Architecture Snapshot` followed by `### File Manifest`, with the `None` behavior that requirement defines. The `### File Manifest` subsection and its `None` sentinel are defined by the `File Manifest is a deterministic net fold over Files Affected` and `File Manifest has an independent None sentinel` requirements of this capability; the persisted manifest in `design.md` is authoritative, and the overview validates it against the recomputed fold per the `change-overview-artifact` capability's `Target State remains authoritative in design.md but is not projected into the overview` requirement.

#### Scenario: Target State is the first section of design.md

- **WHEN** the design phase completes for a change
- **THEN** `design.md`'s first section is `## Target State`
- **AND** every other design section appears after it, while `interfaces.md` contains no `## Target State` section

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

- **WHEN** `design.md` contains a `## Target State` section
- **THEN** each step that introduces a new or modified public interface still has its own `## Step N` section in `interfaces.md` with Interfaces and Test assertions parts

#### Scenario: steps with no interface surface remain omitted

- **WHEN** a step introduces neither a new/modified public interface nor a testable assertion
- **THEN** that step is still omitted from `interfaces.md` entirely
- **AND** the presence of `## Target State` in `design.md` does not cause an empty `## Step N` section to be emitted for it

### Requirement: File Manifest is a deterministic net fold over Files Affected

The `### File Manifest` subsection SHALL be a flat, git-status-style list with exactly one line per file the change creates, modifies, deletes, or renames, produced by a deterministic **net fold** over the per-step `**Files Affected**` entries of the same change's `tasks.md` — the `A`/`M`/`D`/`R` tokens and the `R <src> -> <dst>` form defined by the `tasks-scaffold-format` capability. The manifest SHALL be a target-state view: one path, one line, never a concatenation of per-step entries for the same path.

The fold SHALL process `## Step N` sections in ascending step order and, within a step, its `**Files Affected**` entries in file order. State is keyed by path; each path accumulates a state of `(net token, touched steps)`, seeded empty — empty covering both paths never touched and paths whose earlier touches netted to ∅ — and SHALL transition exactly as the following table. A rename SHALL migrate the accumulator entry to the destination path key and SHALL leave on the source path key a moved-away marker recording whether the source path existed at the change baseline: a source whose state before the rename was `A`, or a prior rename's destination, did not exist at the baseline; a source whose state was `M` or (empty) existed at it. The marker decides the token a later resurrection of the source path folds to. A resurrection dissolves the rename line: the destination then emits `A <dst>` on its own arc, because no rename survives when the source path exists at target state:

| prior net | incoming token | new net |
|-----------|----------------|---------|
| (empty, or ∅) | `A` | `A` |
| (empty) | `M` | `M` |
| (empty) | `D` | `D` |
| (empty, or ∅) | `R` | `R <src> -> <dst>` — the rename merge; the destination is new to the change and the source is not resurrected later |
| `A` | `M` | `A` |
| `A` | `D` | ∅ — the path is omitted from the manifest |
| `A` | `R` | `A <dst>` — the change-created file lives at the destination |
| `M` | `M` | `M` |
| `M` | `D` | `D` |
| `M` | `R` | `R <src> -> <dst>` |
| `D` | `A` | `M` — the path existed before the change and exists after it |
| `D` | `R` (as destination) | no merge — the destination existed at the change baseline: the arcs emit `D <src>` and `M <dst>` |
| `R` (moved away; source existed at baseline) | `A` | `M <src>`, and the rename dissolves into `A <dst>` |
| `R` (moved away; source created by this change) | `A` | `A <src>`, and the rename dissolves into `A <dst>` |
| `R` | `M` | `R <src> -> <dst>` (a target-state view records where the file lands; the extent of the content change is carried by the step's `**What Will Be Done**` prose, per the `R`-token convention of `tasks.md`) |
| `R` | `D` | `D <src>` — the composite dissolves; the deletion of the baseline path is the only fact that survives |
| `R` | `R` | `R <state src> -> <incoming dst>` — a second rename collapses to the existing state's source and the incoming token's destination; the intermediate path appears nowhere |

The existence-based token derivation of `tasks-scaffold-format` constrains the reachable pairs to exactly the table above: a path absent at a step's baseline is touched only by `A` or as the destination of an `R`; a path present at a step's baseline is never `A` and is touched only by `M`, `D`, `R`, or as the source of an `R`.

A path whose **final** state is ∅ SHALL NOT appear in the manifest, even though it appears in `tasks.md`; an intermediate ∅ (created and deleted, later recreated or renamed onto) does not suppress the path's later line. The final-∅ case is the only asymmetry between the two surfaces: every other touched path appears in both.

Every step whose entry folds into a line SHALL be recorded in that line's step-attribution list, in ascending step order — the list names every touching step, not only the step that fixes the net token, so a net-`M` path first touched in Step 2 and modified again in Step 5 reads `(Step 2, Step 5)`, never `(Step 5)` alone. A rename entry contributes its source arc to the source path's line and its destination arc to the destination path's line. When the rename dissolves or collapses, the surviving line(s) carry the rename entry's steps alongside the follow-on entry's steps: `R` + `D` emits `D <src>` carrying the rename step and the deletion step; `R` + `A` emits `A <dst>` carrying the rename step, and the resurrected-source line carries the source-arc steps other than the rename step; `R` + `R` collapses with every rename step carried.

Each line SHALL use the form `<net token> <path> (Step <n>[, Step <n>]*)` — exactly one space between the token and the path, exactly one space before the opening parenthesis, comma-plus-space between step numbers — and a renamed line SHALL use `R <src> -> <dst> (Step <n>…)` with exactly one space on either side of the ` -> ` separator. Lines SHALL NOT be column-aligned or padded.

Lines SHALL be sorted lexicographically by their path — for `R` lines, the destination path (the path right of the ` -> ` separator), reusing the destination-only convention of the routing derivation.

The manifest SHALL be a concise derivative review surface, not a replacement for the authoritative per-step contracts: `tasks.md` remains authoritative for step attribution and per-step tokens, and no downstream phase SHALL parse the manifest as authoritative input.

#### Scenario: a path touched by several steps yields one net line

- **WHEN** `tasks.md` lists `A src/lib/util.ts` in Step 1 and `M src/lib/util.ts` in Step 3
- **THEN** the manifest contains exactly one line, `A src/lib/util.ts (Step 1, Step 3)`
- **AND** no per-step duplicate lines are emitted

#### Scenario: a path created and later deleted is omitted

- **WHEN** `tasks.md` lists `A docs/tmp.md` in Step 2 and `D docs/tmp.md` in Step 6
- **THEN** the manifest contains no line for `docs/tmp.md`
- **AND** this is the only case where a path present in `tasks.md` is absent from the manifest

#### Scenario: a rename folds to the destination path

- **WHEN** `tasks.md` lists `M src/lib/old.ts` in Step 2 and `R src/lib/old.ts -> src/lib/new.ts` in Step 5
- **THEN** the manifest contains `R src/lib/old.ts -> src/lib/new.ts (Step 2, Step 5)`
- **AND** no line is emitted for `src/lib/old.ts`

#### Scenario: a path deleted and recreated folds to M

- **WHEN** `tasks.md` lists `D src/lib/util.ts` in Step 2 and `A src/lib/util.ts` in Step 5
- **THEN** the manifest contains `M src/lib/util.ts (Step 2, Step 5)`
- **AND** the path is not shown as created, because it existed before the change and exists after it

#### Scenario: a resurrected source path dissolves the rename

- **WHEN** `tasks.md` lists `R a.md -> b.md` in Step 2 and `A a.md` in Step 5
- **THEN** the manifest contains `A b.md (Step 2)` and `M a.md (Step 5)`
- **AND** no `R` line is emitted — the repository never reaches a state where `a.md` moved away, because `a.md` exists at target state

#### Scenario: a change-created source resurrected after its rename folds to A

- **WHEN** `tasks.md` lists `A a.md` in Step 1, `R a.md -> b.md` in Step 2, and `A a.md` in Step 5
- **THEN** the manifest contains `A a.md (Step 1, Step 5)` and `A b.md (Step 2)`
- **AND** no line is `M` — `a.md` did not exist at the change baseline

#### Scenario: a rename followed by a deletion emits the baseline path

- **WHEN** `tasks.md` lists `R a.md -> b.md` in Step 2 and `D b.md` in Step 5
- **THEN** the manifest contains `D a.md (Step 2, Step 5)`
- **AND** its sort key is `a.md`, and no line names `b.md`

#### Scenario: a second rename collapses to the original source and the final destination

- **WHEN** `tasks.md` lists `R a.md -> b.md` in Step 2 and `R b.md -> c.md` in Step 4
- **THEN** the manifest contains `R a.md -> c.md (Step 2, Step 4)`
- **AND** no line mentions `b.md`

#### Scenario: a move onto a path deleted earlier in the change dissolves the rename

- **WHEN** `tasks.md` lists `D b.md` in Step 1 and `R a.md -> b.md` in Step 3
- **THEN** the manifest contains `D a.md (Step 3)` and `M b.md (Step 1, Step 3)`
- **AND** no `R` line is emitted — `b.md` existed at the change baseline, so the move is not a rename relative to the baseline

#### Scenario: R lines are sorted by destination path

- **WHEN** a change renames `z-old.ts` to `a-new.ts` and modifies `b-mid.ts`
- **THEN** the `R` line sorts under `a-new.ts`, before the `M` line for `b-mid.ts`
- **AND** the sort key is the destination path, not the source path

#### Scenario: step attribution lists every touching step

- **WHEN** a path is touched in Steps 2 and 5 with net token `M`
- **THEN** its line reads `(Step 2, Step 5)`
- **AND** the Step 2 touch is not hidden by the Step 5 token

#### Scenario: separators are single spaces, no alignment

- **WHEN** two design agents emit the manifest for the same `tasks.md`
- **THEN** both use the same single-space separators and no column padding
- **AND** both produce byte-identical lines

#### Scenario: the fold is reproducible from tasks.md alone

- **WHEN** a second design agent is given the same `tasks.md` and this fold table
- **THEN** it produces a byte-identical `### File Manifest`

### Requirement: File Manifest has an independent None sentinel

When the net fold produces no lines, `### File Manifest` SHALL carry the exact sentinel `None — no files affected` followed by a one-line reason. The empty fold is reachable only when the change nets to nothing: every `**Files Affected**` entry cancels to ∅ — each path the change touches is created and later deleted within the same change. A conforming reason line is `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)`. The sentinel SHALL be independent of the `### Architecture Snapshot`'s `None — no planned public surfaces` sentinel: a change that plans no public surfaces SHALL still emit its full manifest beneath the snapshot's `None`, and the two subsections' sentinels SHALL NOT interact or suppress each other.

#### Scenario: docs-only change emits snapshot None and a full manifest

- **WHEN** a change touches only documentation files and plans no public classes, interfaces, or methods
- **THEN** `### Architecture Snapshot` carries `None — no planned public surfaces`
- **AND** `### File Manifest` directly beneath it still carries the full folded list of the change's files

#### Scenario: empty fold emits the manifest sentinel

- **WHEN** a change creates `docs/tmp.md` in Step 2, deletes it in Step 6, and touches no other file
- **THEN** `### File Manifest` carries `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)`
- **AND** the sentinel is emitted regardless of the Architecture Snapshot's content

### Requirement: File Manifest glossary term

The `## Language` section of `GLOSSARY.md` at the project root SHALL contain exactly one `**File Manifest**` entry with a one-sentence definition stating what it IS — the flat `design.md` subsection under `## Target State` that lists every file the change creates, modifies, deletes, or renames, path-sorted and git-status-style with step attribution, derived by a deterministic net fold over the per-step `**Files Affected**` entries of `tasks.md`, and projected into `change-overview.md`. The entry SHALL carry an `*Avoid*` line rejecting the aliases "file list", "file inventory", and "change file list".

The `## Relationships` section of `GLOSSARY.md` SHALL contain an entry linking **File Manifest** to **Target State** and to **File Change Type** — the manifest is the file-level sibling of the **Architecture Snapshot** under one **Target State**, and its net fold consumes the per-step **File Change Type** tokens of `tasks.md`.

The `## Flagged ambiguities` section of `GLOSSARY.md` SHALL contain an entry resolving the "Files Affected vs File Manifest" overload in favor of the split: **Files Affected** names the per-step `tasks.md` field, **File Manifest** names the aggregated `design.md` subsection.

#### Scenario: File Manifest entry present in Language with Avoid aliases

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Language` contains exactly one `**File Manifest**` entry
- **AND** the entry carries an `*Avoid*` line rejecting "file list", "file inventory", and "change file list"

#### Scenario: File Manifest linked to Target State and File Change Type in Relationships

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Relationships` contains an entry linking **File Manifest** to **Target State** and **File Change Type**
- **AND** the relationship notes the manifest is the file-level sibling of the **Architecture Snapshot** under one **Target State**

#### Scenario: Files Affected vs File Manifest ambiguity resolved in Flagged ambiguities

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Flagged ambiguities` contains an entry resolving the per-step field vs the aggregated subsection overload
- **AND** a rationale for the split is stated
