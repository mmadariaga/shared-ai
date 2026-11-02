# design-target-state Specification

## Purpose

Define the target-state design artifact and its derived Architecture Snapshot and File Manifest contracts.

## Requirements

### Requirement: design.md opens with a Target State section

Design SHALL begin with `## Target State`, authored and persisted as the authoritative finished-shape record before other design sections. Its File Manifest SHALL be folded deterministically from Tasks entries. Interfaces SHALL begin with its first numbered Step and SHALL NOT contain Target State, Architecture Snapshot, or File Manifest sections.

Target State SHALL present one concrete finished artifact rather than a Step walkthrough or motivation restatement. For code changes this includes the final payload, signature, schema, layout, or configuration. For prose changes this includes the resulting document section and field structure. A reader SHALL be able to determine the finished shape without reading Steps. If no expressible finished shape exists, Target State SHALL carry explicit None and a one-line reason rather than be silently omitted.

After that artifact, Target State SHALL contain exactly one subsection, `### File Manifest`. The design step SHALL NOT emit an `### Architecture Snapshot` subsection, and the `design.md` template SHALL NOT scaffold one. When the File Manifest is absent, `sai/tools/file-manifest.js fold` SHALL create it at the end of `## Target State`; in a `design.md` written earlier that still carries `### Architecture Snapshot`, it SHALL place the manifest after that subsection. The deterministic manifest rules and the manifest's absence sentinel SHALL remain unchanged.

The overview SHALL NOT validate the manifest fold. It SHALL exclude the File Manifest subtree, and, for a design written earlier, the Architecture Snapshot subtree at any heading depth, retain any remaining selected Target State content, and omit the Target State heading if empty after exclusions.

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
- **WHEN** the design phase writes `## Target State` for a new change
- **THEN** its only subsection is `### File Manifest`, with no `### Architecture Snapshot` subsection

#### Scenario: target-state-folds-task-entries
- **WHEN** the design worker generates Target State from task entries
- **THEN** it contains the authoritative finished-shape artifact and the deterministically derived manifest at the end of the section

### Requirement: Target State does not replace or duplicate per-step interfaces

`## Target State` SHALL NOT remove the obligation to emit per-step `## Interfaces` and `## Test assertions` content for each step that introduces an interface surface. The per-step sections remain the authoritative record of *which step* introduces *which* signature; `## Target State` is the destination view.

Where a signature appears in both `## Target State` and a `## Step N` section, the `## Step N` section SHALL remain the authority on step attribution.

#### Scenario: per-step sections still emitted alongside Target State

- **WHEN** `design.md` contains a `## Target State` section
- **THEN** each step that introduces a new or modified public interface still has its own `## Step N` section in `interfaces.md` with Interfaces and Test assertions parts

#### Scenario: steps with no interface surface remain omitted

- **WHEN** a step introduces neither a new/modified public interface nor a testable assertion
- **THEN** that step is still omitted from `interfaces.md` entirely, and the presence of `## Target State` in `design.md` does not cause an empty `## Step N` section to be emitted for it

#### Scenario: snapshot grouping does not replace step authority

- **WHEN** a public method appears in `## Target State` and is introduced by a particular step
- **THEN** the matching `interfaces.md` step remains authoritative for that method's signature, attribution, and test assertions, and Target State creates no second per-step contract

### Requirement: File Manifest is a deterministic net fold over Files Affected

The `### File Manifest` subsection SHALL be a flat, git-status-style list produced by a deterministic net fold over the same change's per-Step Files Affected entries. Each non-empty generated manifest entry SHALL be a Markdown bullet prefixed with `- `. Ordinary exact-file entries SHALL yield exactly one line per file the change creates, modifies, deletes, or renames, using the A/M/D/R tokens and R source-to-destination form defined by tasks-scaffold-format. One exact path SHALL have one net line rather than concatenated per-Step entries.

Bounded generated A families SHALL be the sole exception to the individual-file line contract. The manifest SHALL retain one derivative family line as `- A <directory>/<prefix>*<suffix> — generated count=<positive integer> (Step <n>)`, preserving the declaration's directory, family, expected count, and attribution. This line SHALL not be an executable path or independently authorize writes. Apply SHALL resolve the authoritative task declaration to exact paths before close. Overlapping generated families and generated-family collisions recognized by the fold SHALL be rejected rather than silently merged.

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

Ordinary lines SHALL use `- <net token> <path> (Step <n>[, Step <n>]*)`; renamed lines SHALL use `- R <src> -> <dst> (Step <n>…)`. Generated derivative lines SHALL retain the count suffix before the attribution. Token/path and pre-parenthesis separators SHALL be single spaces; Step separators SHALL be comma-plus-space; R separators SHALL be single spaces around the arrow. Lines SHALL not be aligned or padded.

Lines SHALL be path-sorted, using R destination paths and generated declaration paths as their respective keys. The manifest SHALL remain a concise derivative review surface. Tasks SHALL remain authoritative for per-Step tokens, declarations, and attribution; downstream phases SHALL not parse the manifest as authoritative executable input.

The bullet prefix SHALL change presentation only. Verification SHALL continue to accept legacy unbulleted manifest entries without rewriting them; explicit regeneration SHALL emit bullets. Empty markers, net-fold transitions, ordering, generated-family counts, and Step attribution SHALL remain unchanged.

#### Scenario: a path touched by several steps yields one net line
- **WHEN** tasks list `A src/lib/util.ts` in Step 1 and `M src/lib/util.ts` in Step 3
- **THEN** the manifest contains exactly `- A src/lib/util.ts (Step 1, Step 3)` without per-Step duplicate lines

#### Scenario: a path created and later deleted is omitted
- **WHEN** tasks list `A docs/tmp.md` in Step 2 and `D docs/tmp.md` in Step 6
- **THEN** the manifest contains no line for docs/tmp.md, retaining final cancellation as the ordinary exact-path omission case

#### Scenario: a rename folds to the destination path
- **WHEN** tasks list `M src/lib/old.ts` in Step 2 and `R src/lib/old.ts -> src/lib/new.ts` in Step 5
- **THEN** the manifest contains `- R src/lib/old.ts -> src/lib/new.ts (Step 2, Step 5)` without a separate old-path line

#### Scenario: a path deleted and recreated folds to M
- **WHEN** tasks list `D src/lib/util.ts` in Step 2 and `A src/lib/util.ts` in Step 5
- **THEN** the manifest contains `- M src/lib/util.ts (Step 2, Step 5)` because the path exists before and after the change

#### Scenario: a resurrected source path dissolves the rename
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `A a.md` in Step 5
- **THEN** the manifest contains `- A b.md (Step 2)` and `- M a.md (Step 5)` without an R line

#### Scenario: a change-created source resurrected after its rename folds to A
- **WHEN** tasks list `A a.md` in Step 1, `R a.md -> b.md` in Step 2, and `A a.md` in Step 5
- **THEN** the manifest contains `- A a.md (Step 1, Step 5)` and `- A b.md (Step 2)` with no M line

#### Scenario: a rename followed by a deletion emits the baseline path
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `D b.md` in Step 5
- **THEN** the manifest contains `- D a.md (Step 2, Step 5)`, sorted by a.md, and no line names b.md

#### Scenario: a second rename collapses to the original source and the final destination
- **WHEN** tasks list `R a.md -> b.md` in Step 2 and `R b.md -> c.md` in Step 4
- **THEN** the manifest contains `- R a.md -> c.md (Step 2, Step 4)` and no line mentions b.md

#### Scenario: a move onto a path deleted earlier in the change dissolves the rename
- **WHEN** tasks list `D b.md` in Step 1 and `R a.md -> b.md` in Step 3
- **THEN** the manifest contains `- D a.md (Step 3)` and `- M b.md (Step 1, Step 3)` without an R line because b.md existed at the change baseline

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
- **THEN** the manifest contains `- A generated/migration-*.sql — generated count=2 (Step 1)` rather than inventing filenames or authorizing wildcard staging

### Requirement: File Manifest has an independent None sentinel

When the net fold produces no lines, File Manifest SHALL carry the exact sentinel `None — no files affected` followed by a one-line reason. An empty fold SHALL be valid when every ordinary touched path cancels to ∅ or when recognized None declarations explicitly identify no affected files. Explicit empty declarations SHALL not be confused with missing declarations.

For the cancellation case, a conforming reason SHALL remain `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)`.

A change without public surfaces but with affected files SHALL still emit its full manifest.

#### Scenario: docs-only change emits snapshot None and a full manifest
- **WHEN** a change touches only documentation and plans no public surfaces
- **THEN** the File Manifest carries the full folded file list, with no Architecture Snapshot sentinel beside it

#### Scenario: empty fold emits the manifest sentinel
- **WHEN** a change creates docs/tmp.md in Step 2, deletes it in Step 6, and touches no other file
- **THEN** the manifest carries `None — no files affected (every touched path is created and deleted within the change, so nothing remains at target state)`

#### Scenario: Explicit None produces an intentional empty manifest
- **WHEN** recognized task declarations explicitly identify no affected files
- **THEN** the empty manifest carries its own no-files-affected sentinel and one-line reason

### Requirement: File Manifest glossary term

The Language section of project-root GLOSSARY SHALL retain exactly one File Manifest entry defining the flat design subsection beneath Target State that lists net created, modified, deleted, or renamed files, sorted by path in Git-status form with Step attribution and derived by deterministic folding of Tasks Files Affected. The manifest SHALL remain distinct from the literal per-Step Files Affected selected by the overview; the overview SHALL exclude the manifest rather than project it.

The entry SHALL retain its Avoid aliases for file list, file inventory, and change file list. Relationships SHALL link File Manifest to Target State, as the answer to which files will change, and to File Change Type, as the consumer of per-Step change-type tokens. The glossary SHALL define no Architecture Snapshot, External Surface, or Internal Public Surface entry. Flagged ambiguities SHALL distinguish per-Step Files Affected from the aggregated design File Manifest.

#### Scenario: File Manifest entry present in Language with Avoid aliases
- **WHEN** the glossary's File Manifest entry is read
- **THEN** exactly one Language entry and its existing Avoid aliases identify the aggregated design subsection

#### Scenario: File Manifest linked to Target State and File Change Type in Relationships
- **WHEN** glossary relationships are read
- **THEN** they link File Manifest to Target State and File Change Type and name no Architecture Snapshot sibling

#### Scenario: Files Affected vs File Manifest ambiguity resolved in Flagged ambiguities
- **WHEN** the glossary distinction is read
- **THEN** Files Affected denotes the per-Step Tasks field and File Manifest denotes the aggregated design subsection, not an overview file list

### Requirement: Snapshot boundary changes are prospective and preserve existing artifacts

The retirement of the Architecture Snapshot SHALL apply to future design authoring. It SHALL NOT rewrite existing `openspec/changes/{name}/design.md` documents to remove a snapshot they already carry. A change in progress whose `design.md` still carries `### Architecture Snapshot` SHALL be implemented and reviewed without failure: the subsection is ignored, the manifest fold keeps it in place, and no lint check rejects it.

#### Scenario: existing design documents are not rewritten
- **WHEN** the updated design contract is installed while an existing change already has a `design.md` with an Architecture Snapshot
- **THEN** that `design.md` is not rewritten, and the change is still implemented and reviewed without failure
