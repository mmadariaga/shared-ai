# design-target-state Specification

## Purpose

Define the target-state design artifact and its derived Architecture Snapshot and File Manifest contracts.

## Requirements

### Requirement: design.md opens with a Target State section

Design SHALL begin with `## Target State`, authored and persisted as the authoritative finished-shape record before other design sections. Its File Manifest SHALL be folded deterministically from Tasks entries. Interfaces SHALL begin with its first numbered Step and SHALL NOT contain Target State, Architecture Snapshot, or File Manifest sections.

Target State SHALL present one concrete finished artifact rather than a Step walkthrough or motivation restatement. For code changes this includes the final payload, signature, schema, layout, or configuration. For prose changes this includes the resulting document section and field structure. A reader SHALL be able to determine the finished shape without reading Steps. If no expressible finished shape exists, Target State SHALL carry explicit None and a one-line reason rather than be silently omitted.

Target State SHALL contain exactly Architecture Snapshot followed by File Manifest as sibling subsections. Snapshot boundary blocks SHALL remain nested structure, not additional siblings. Existing independent absence sentinels and deterministic manifest rules SHALL remain unchanged.

The overview SHALL not adapt the snapshot into Target Architecture or validate the manifest fold. It SHALL exclude Architecture Snapshot and File Manifest subtrees, retain any remaining selected Target State content, and omit the Target State heading if empty after exclusions.

#### Scenario: Target State is the first section of design.md
- **WHEN** the design phase completes
- **THEN** design starts with Target State, other design sections follow, and Interfaces contains no Target State section

#### Scenario: Target State is one concrete artifact, not a step walkthrough
- **WHEN** a change modifies a public signature and serialized schema
- **THEN** Target State shows their final shapes without describing intermediate Step shapes

#### Scenario: prose change states its finished document structure
- **WHEN** a change modifies instructions or documentation
- **THEN** Target State states the finished section and field structures and is not omitted merely because no code payload or signature is involved

#### Scenario: no expressible finished shape
- **WHEN** a change has no expressible finished shape
- **THEN** design emits explicit None and a one-line reason in Target State instead of omitting the section

#### Scenario: Target State is readable without the step sections
- **WHEN** a reader reads Target State alone
- **THEN** the finished shape is determined without requiring a Step section

#### Scenario: nested snapshot structure does not add a Target State sibling
- **WHEN** design contains both snapshot boundary blocks
- **THEN** Target State still has exactly Architecture Snapshot followed by File Manifest as its sibling subsections

#### Scenario: target-state-folds-task-entries
- **WHEN** the design worker generates Target State from task entries
- **THEN** it contains the authoritative snapshot and deterministically derived manifest

### Requirement: Target State does not replace or duplicate per-step interfaces

`## Target State` SHALL NOT remove the obligation to emit per-step `## Interfaces` and `## Test assertions` content for each step that introduces an interface surface. The per-step sections remain the authoritative record of *which step* introduces *which* signature; `## Target State` is the destination view. The external/internal grouping in `### Architecture Snapshot` is a review classification only and SHALL NOT change step attribution, detailed signatures, or exact test assertions.

Where a signature appears in both `## Target State` and a `## Step N` section, the `## Step N` section SHALL remain the authority on step attribution.

#### Scenario: per-step sections still emitted alongside Target State

- **WHEN** `design.md` contains a `## Target State` section
- **THEN** each step that introduces a new or modified public interface still has its own `## Step N` section in `interfaces.md` with Interfaces and Test assertions parts

#### Scenario: steps with no interface surface remain omitted

- **WHEN** a step introduces neither a new/modified public interface nor a testable assertion
- **THEN** that step is still omitted from `interfaces.md` entirely
- **AND** the presence of `## Target State` in `design.md` does not cause an empty `## Step N` section to be emitted for it

#### Scenario: snapshot grouping does not replace step authority

- **WHEN** a public method is listed in either Architecture Snapshot boundary block and introduced by a particular step
- **THEN** the matching `interfaces.md` step remains authoritative for that method's signature, attribution, and test assertions
- **AND** the snapshot's block classification does not create a second per-step contract

### Requirement: File Manifest is a deterministic net fold over Files Affected

The `### File Manifest` subsection SHALL be a flat, git-status-style list produced by a deterministic net fold over the same change's per-Step Files Affected entries. Ordinary exact-file entries SHALL yield exactly one line per file the change creates, modifies, deletes, or renames, using the A/M/D/R tokens and R source-to-destination form defined by tasks-scaffold-format. One exact path SHALL have one net line rather than concatenated per-Step entries.

Bounded generated A families SHALL be the sole exception to the individual-file line contract. The manifest SHALL retain one derivative family line as `A <directory>/<prefix>*<suffix> — generated count=<positive integer> (Step <n>)`, preserving the declaration's directory, family, expected count, and attribution. This line SHALL not be an executable path or independently authorize writes. Apply SHALL resolve the authoritative task declaration to exact paths before close. Overlapping generated families and generated-family collisions recognized by the fold SHALL be rejected rather than silently merged.

For ordinary exact paths, the fold SHALL process Step sections in ascending order and entries in file order. State SHALL be keyed by path, with net token and touched Steps seeded empty. Empty SHALL cover both untouched paths and paths whose earlier touches netted to ∅.

A rename SHALL migrate the accumulator to the destination key and leave a moved-away marker at the source recording whether it existed at the change baseline. A source whose pre-rename state was A or a prior rename destination did not exist at that baseline; a source whose state was M or empty existed. A later resurrection SHALL use that marker and dissolve the rename, with the destination emitting its own A arc.

Ordinary exact-path transitions SHALL remain:

| prior net | incoming token | new net |
|-----------|----------------|---------|
| (empty, or ∅) | A | A |
| (empty) | M | M |
| (empty) | D | D |
| (empty, or ∅) | R | R source -> destination, with a new destination and no later source resurrection |
| A | M | A |
| A | D | ∅ |
| A | R | A destination |
| M | M | M |
| M | D | D |
| M | R | R source -> destination |
| D | A | M |
| D | R as destination | D source and M destination; no rename merge |
| R moved away, source existed at baseline | A | M source and A destination; rename dissolves |
| R moved away, source created by this change | A | A source and A destination; rename dissolves |
| R | M | R source -> destination |
| R | D | D original source |
| R | R | R original source -> final destination |

Existence-based ordinary token derivation SHALL retain the table's reachable pairs: a path absent at a Step's baseline is touched only by A or as an R destination; a present path is never A and is touched only by M, D, R, or as an R source. Content rewrites after R SHALL remain described by the Step prose rather than alter the rename token.

An exact path whose final state is ∅ SHALL be omitted even though it appears in tasks. Intermediate ∅ SHALL not suppress later recreation or renaming onto that path. Final ∅ SHALL remain the only omission asymmetry for ordinary exact entries; every other touched exact path SHALL appear in both surfaces. Generated declarations SHALL appear as bounded derivatives rather than individual unresolved paths.

Every Step whose entry folds into a line SHALL appear in its attribution list in ascending order, including every touch rather than only the Step fixing the net token. A rename SHALL contribute source and destination arcs to their corresponding lines. Dissolved or collapsed renames SHALL retain the appropriate Steps: R then D carries both on D source; R then source A carries the rename Step on A destination and source-arc Steps other than the rename on the resurrected source; chained R carries all rename Steps.

Ordinary lines SHALL use `<net token> <path> (Step <n>[, Step <n>]*)`; renamed lines SHALL use `R <src> -> <dst> (Step <n>…)`. Generated derivative lines SHALL retain the count suffix before the attribution. Token/path and pre-parenthesis separators SHALL be single spaces; Step separators SHALL be comma-plus-space; R separators SHALL be single spaces around the arrow. Lines SHALL not be aligned or padded.

Lines SHALL be path-sorted, using R destination paths and generated declaration paths as their respective keys. The manifest SHALL remain a concise derivative review surface. Tasks SHALL remain authoritative for per-Step tokens, declarations, and attribution; downstream phases SHALL not parse the manifest as authoritative executable input.

#### Scenario: a path touched by several steps yields one net line
- **WHEN** tasks list `A src/lib/util.ts` in Step 1 and `M src/lib/util.ts` in Step 3
- **THEN** the manifest contains exactly `A src/lib/util.ts (Step 1, Step 3)` without per-Step duplicate lines

#### Scenario: a path created and later deleted is omitted
- **WHEN** tasks list `A docs/tmp.md` in Step 2 and `D docs/tmp.md` in Step 6
- **THEN** the manifest contains no line for docs/tmp.md, retaining final cancellation as the ordinary exact-path omission case

#### Scenario: a rename folds to the destination path
- **WHEN** tasks list `M src/lib/old.ts` in Step 2 and `R src/lib/old.ts -> src/lib/new.ts` in Step 5
- **THEN** the manifest contains `R src/lib/old.ts -> src/lib/new.ts (Step 2, Step 5)` without a separate old-path line

#### Scenario: a path deleted and recreated folds to M
- **WHEN** tasks list `D src/lib/util.ts` in Step 2 and `A src/lib/util.ts` in Step 5
- **THEN** the manifest contains `M src/lib/util.ts (Step 2, Step 5)` because the path exists before and after the change

#### Scenario: a resurrected source path dissolves the rename
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `A a.md` in Step 5
- **THEN** the manifest contains `A b.md (Step 2)` and `M a.md (Step 5)` without an R line

#### Scenario: a change-created source resurrected after its rename folds to A
- **WHEN** tasks list `A a.md` in Step 1, `R a.md -> b.md` in Step 2, and `A a.md` in Step 5
- **THEN** the manifest contains `A a.md (Step 1, Step 5)` and `A b.md (Step 2)` with no M line

#### Scenario: a rename followed by a deletion emits the baseline path
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `D b.md` in Step 5
- **THEN** the manifest contains `D a.md (Step 2, Step 5)`, sorted by a.md, and no line names b.md

#### Scenario: a second rename collapses to the original source and the final destination
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `R b.md -> c.md` in Step 4
- **THEN** the manifest contains `R a.md -> c.md (Step 2, Step 4)` and no line mentions b.md

#### Scenario: a move onto a path deleted earlier in the change dissolves the rename
- **WHEN** tasks list `D b.md` in Step 1 and `R a.md -> b.md` in Step 3
- **THEN** the manifest contains `D a.md (Step 3)` and `M b.md (Step 1, Step 3)` without an R line because b.md existed at the change baseline

#### Scenario: R lines are sorted by destination path
- **WHEN** a change renames z-old.ts to a-new.ts and modifies b-mid.ts
- **THEN** its R line sorts by a-new.ts before the M line for b-mid.ts rather than sorting by the source

#### Scenario: step attribution lists every touching step
- **WHEN** a path is touched in Steps 2 and 5 with net token M
- **THEN** its attribution reads `(Step 2, Step 5)` without hiding the Step 2 touch

#### Scenario: separators are single spaces, no alignment
- **WHEN** two design agents emit the manifest for the same tasks
- **THEN** both use single-space separators without column padding and produce byte-identical lines

#### Scenario: the fold is reproducible from tasks.md alone
- **WHEN** a second design agent receives the same tasks and normative fold rules
- **THEN** it produces a byte-identical File Manifest

#### Scenario: Generated count remains a derivative declaration
- **WHEN** Step 1 declares `A generated/migration-*.sql — generated count=2`
- **THEN** the manifest contains `A generated/migration-*.sql — generated count=2 (Step 1)` rather than inventing filenames or authorizing wildcard staging

### Requirement: File Manifest has an independent None sentinel

When the net fold produces no lines, File Manifest SHALL carry the exact sentinel `None — no files affected` followed by a one-line reason. An empty fold SHALL be valid when every ordinary touched path cancels to ∅ or when recognized None declarations explicitly identify no affected files. Explicit empty declarations SHALL not be confused with missing declarations.

For the cancellation case, a conforming reason SHALL remain `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)`.

The manifest sentinel SHALL remain independent of the whole Architecture Snapshot inventory's `None — no planned public surfaces` sentinel and each boundary block's empty rendering. A change without public surfaces but with affected files SHALL still emit its full manifest. Neither subsection's sentinel SHALL suppress the other.

#### Scenario: docs-only change emits snapshot None and a full manifest
- **WHEN** a change touches only documentation and plans no externally consumable or internal public surfaces
- **THEN** the snapshot carries its shared no-public-surfaces sentinel without empty boundary blocks, and the File Manifest independently carries the full folded file list

#### Scenario: empty fold emits the manifest sentinel
- **WHEN** a change creates docs/tmp.md in Step 2, deletes it in Step 6, and touches no other file
- **THEN** the manifest carries `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)` regardless of snapshot content

#### Scenario: Explicit None produces an intentional empty manifest
- **WHEN** recognized task declarations explicitly identify no affected files
- **THEN** the empty manifest carries its own no-files-affected sentinel and one-line reason independently of the snapshot

### Requirement: File Manifest glossary term

The Language section of project-root GLOSSARY SHALL retain exactly one File Manifest entry defining the flat design subsection beneath Target State that lists net created, modified, deleted, or renamed files, sorted by path in Git-status form with Step attribution and derived by deterministic folding of Tasks Files Affected. The manifest SHALL remain distinct from the literal per-Step Files Affected selected by the overview; the overview SHALL exclude the manifest rather than project it.

The entry SHALL retain its Avoid aliases for file list, file inventory, and change file list. Relationships SHALL link File Manifest to Target State and File Change Type, identifying it as the snapshot's file-level sibling and consumer of per-Step change-type tokens. Flagged ambiguities SHALL distinguish per-Step Files Affected from the aggregated design File Manifest.

#### Scenario: File Manifest entry present in Language with Avoid aliases
- **WHEN** the glossary's File Manifest entry is read
- **THEN** exactly one Language entry and its existing Avoid aliases identify the aggregated design subsection

#### Scenario: File Manifest linked to Target State and File Change Type in Relationships
- **WHEN** glossary relationships are read
- **THEN** they link File Manifest to Target State and File Change Type and identify its sibling relationship with Architecture Snapshot

#### Scenario: Files Affected vs File Manifest ambiguity resolved in Flagged ambiguities
- **WHEN** the glossary distinction is read
- **THEN** Files Affected denotes the per-Step Tasks field and File Manifest denotes the aggregated design subsection, not an overview file list

### Requirement: Architecture Snapshot is partitioned by caller boundary

When `### Architecture Snapshot` contains at least one planned public surface, it SHALL contain exactly two ordered nested blocks: `#### External Surfaces` first and `#### Internal Public Surfaces` second. A surface SHALL be classified as external when callers, users, or integrations outside the repository's controlled caller boundary may consume or depend on it. A surface SHALL be classified as internal public when it is intentionally public but its callers are constrained to the repository or another explicitly controlled part of the change. When classification is unclear, the surface SHALL default to `External Surfaces`.

The external block SHALL inventory externally consumable typed commands, produced artifact formats, installed file layout, and other public promises that the change plans, including public classes, interfaces, and methods when their callers are uncontrolled. The internal block SHALL inventory internal public classes, interfaces, methods, and other public surfaces that the change plans when their callers are controlled. Each surface SHALL be listed once with its project-root-relative path or owning location and concise portable-ASCII relationships or execution flow where relevant. The snapshot SHALL remain surface-oriented: it MAY identify an installed layout or produced format as a public surface, but SHALL NOT duplicate every `File Manifest` entry as a surface merely because a file is touched. The snapshot SHALL NOT introduce or author a separate Endpoint Map block, endpoint-map table, or endpoint-map announcement; endpoint-like public promises belong in the external block.

#### Scenario: external surfaces precede internal public surfaces

- **WHEN** a change exposes a typed command and produced artifact format to uncontrolled consumers and also changes a public helper used only by repository code
- **THEN** the typed command and artifact format appear under `#### External Surfaces`
- **AND** the helper appears under `#### Internal Public Surfaces`
- **AND** the external block is rendered before the internal block

#### Scenario: installed layout is an external surface without replacing the manifest

- **WHEN** a change changes the installed file layout that consumers locate or load
- **THEN** the layout promise appears once under `#### External Surfaces` with its owning path
- **AND** the individual changed files remain represented by `### File Manifest` rather than being copied into the snapshot as substitute entries

#### Scenario: unclear boundary classification is conservative

- **WHEN** the available evidence does not establish whether callers of a planned public method are controlled
- **THEN** the method appears under `#### External Surfaces`
- **AND** it is not silently treated as internal

#### Scenario: endpoint-map structure is not reintroduced

- **WHEN** a design author writes the Architecture Snapshot
- **THEN** no Endpoint Map heading, endpoint-map block, endpoint table, or endpoint-map announcement is authored
- **AND** any endpoint-like public promise is reviewed as an external surface

### Requirement: Architecture Snapshot has one shared empty-inventory sentence

When neither boundary has a planned public surface, `### Architecture Snapshot` SHALL emit no nested boundary-block headings and SHALL carry exactly one shared emptiness sentence, `None — no planned public surfaces`, followed by one line explaining why the complete inventory is empty. This shared sentence describes the whole inventory and SHALL NOT be repeated once either block has an entry. When one boundary has no entries but the other has at least one, both nested blocks SHALL still be emitted in their required order; the empty block SHALL use its own block-specific rendering, `None — no planned externally consumable surfaces` for `#### External Surfaces` or `None — no planned internal public surfaces` for `#### Internal Public Surfaces`, followed by a one-line reason. A block-specific rendering SHALL NOT use or be substituted for the shared `None — no planned public surfaces` sentence. These snapshot renderings SHALL remain independent from the File Manifest sentinel.

#### Scenario: both boundary blocks are empty

- **WHEN** a change plans no externally consumable surfaces and no internal public surfaces
- **THEN** `### Architecture Snapshot` contains one `None — no planned public surfaces` sentence and one explanatory reason line
- **AND** it contains neither `#### External Surfaces` nor `#### Internal Public Surfaces`

#### Scenario: only the external block is empty

- **WHEN** a change plans internal public surfaces but no externally consumable surfaces
- **THEN** `#### External Surfaces` appears first with `None — no planned externally consumable surfaces` and its one-line reason
- **AND** `#### Internal Public Surfaces` follows with the planned internal entries
- **AND** the shared `None — no planned public surfaces` sentence is not emitted

#### Scenario: only the internal block is empty

- **WHEN** a change plans externally consumable surfaces but no internal public surfaces
- **THEN** `#### External Surfaces` appears with the planned external entries
- **AND** `#### Internal Public Surfaces` follows with `None — no planned internal public surfaces` and its one-line reason
- **AND** the shared `None — no planned public surfaces` sentence is not emitted

#### Scenario: snapshot emptiness does not suppress the manifest

- **WHEN** the complete Architecture Snapshot inventory is empty but the change has files that remain at target state
- **THEN** the shared snapshot sentence is emitted
- **AND** the full deterministic `### File Manifest` is still emitted independently

### Requirement: Derived change-overview rendering preserves snapshot boundary order

The overview generator SHALL exclude Architecture Snapshot at any heading depth with its complete subtree, including boundary headings, surfaces, and empty-inventory explanations. It SHALL NOT adapt that snapshot into Target Architecture, emit Snapshot boundary wrappers, or synthesize replacement snapshot facts from other sources.

This overview exclusion SHALL NOT change authoritative design authoring: non-empty snapshots retain External Surfaces before Internal Public Surfaces, the conservative boundary classification, and the existing whole-inventory and block-specific absence rules.

#### Scenario: non-empty division propagates to the overview
- **WHEN** design contains external and internal snapshot boundary blocks
- **THEN** the overview excludes both blocks with the snapshot subtree while design retains their external-first order

#### Scenario: whole-inventory sentinel remains source-only
- **WHEN** the snapshot contains only its shared no-planned-public-surfaces sentence and reason
- **THEN** the overview excludes that complete snapshot content without inventing replacement facts

#### Scenario: one empty block remains distinguishable when projected
- **WHEN** design contains one populated snapshot boundary and one block-specific empty rendering
- **THEN** design retains that distinction and order while the overview excludes both with the snapshot subtree

### Requirement: Architecture Snapshot boundary terms are defined in the glossary

The project-root `GLOSSARY.md` SHALL contain exactly one `**External Surface**` entry defining an externally consumable public promise whose callers, users, or integrations may be outside the repository's controlled caller boundary, and exactly one `**Internal Public Surface**` entry defining a public promise whose callers are constrained to the repository or another explicitly controlled part of the change. Each entry SHALL carry an `*Avoid*` line that rejects ambiguous endpoint/API or private-surface aliases. The `## Relationships` section SHALL link **Architecture Snapshot** to an external-first **External Surface** block and an **Internal Public Surface** block. The `## Flagged ambiguities` section SHALL distinguish the terms by caller boundary: **External Surface** names uncontrolled callers and **Internal Public Surface** names controlled callers.

#### Scenario: boundary terms have canonical glossary entries

- **WHEN** `GLOSSARY.md` is read after the change's terminology update
- **THEN** `## Language` contains exactly one `**External Surface**` entry and exactly one `**Internal Public Surface**` entry
- **AND** each entry carries an `*Avoid*` line

#### Scenario: Architecture Snapshot relationships name both blocks

- **WHEN** the glossary relationships are read
- **THEN** an entry links **Architecture Snapshot** to the external-first **External Surface** block and the **Internal Public Surface** block
- **AND** the external block is named before the internal block

#### Scenario: caller-boundary terms are distinguished

- **WHEN** a glossary reader encounters the distinction between the two boundary terms
- **THEN** `## Flagged ambiguities` states that **External Surface** names uncontrolled callers and **Internal Public Surface** names controlled callers
- **AND** the terms are not treated as synonyms

### Requirement: Snapshot boundary changes are prospective and preserve existing artifacts

The boundary split SHALL apply to future design authoring and to derived rendering of source artifacts that are generated or regenerated under the updated contract. The spec change SHALL NOT rewrite existing `openspec/changes/{name}/design.md` documents solely to introduce the two boundary blocks. The Architecture Snapshot remains a derivative review surface and SHALL NOT become a new source of truth for per-step contracts or a reason to rewrite an existing design document.

#### Scenario: existing design documents are not rewritten

- **WHEN** the updated design contract is installed while an existing change already has a `design.md`
- **THEN** that existing `design.md` is not rewritten solely because the Architecture Snapshot contract changed
- **AND** future authoring follows the external-first/internal-second contract
