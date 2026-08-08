**Complexity**: medium (2 capabilities, 4 files, no breaking change)

## Why

The `### Architecture Snapshot` is the review surface reprinted before each design feedback iteration, but it inventories only planned public code surfaces — a reviewer cannot see the change's file-level blast radius there. The per-step `**Files Affected**` data already exists in `tasks.md` (derived from the repo state immediately before each step's commit) and is never aggregated into a whole-change view.

## What Changes

- `sai/instructions/design.md` gains a `### File Manifest` subsection in the `### Generate interfaces.md` section, emitted directly beneath `### Architecture Snapshot` under `## Target State` in `interfaces.md`.
- The subsection is a flat, git-status-style, path-sorted list of every file the change creates, modifies, deletes, or renames, with step attribution — the change's file-level blast radius as one reviewable surface.
- The manifest is derived by a deterministic **net fold** over the per-step `**Files Affected**` entries of `tasks.md`, with a written fold table (A→M = A, A→D = ∅, M→D = D, A→R = A at destination, M→R = R src -> dst, plus the remaining reachable pairs), lexicographic sort keyed on the path (`R` entries on their destination path), and single-space separators with no column alignment — so a second design agent given the same `tasks.md` produces a byte-identical manifest.
- Step attribution lists every step touching a path, not only the step that fixes the net token, so a net-`M` path cannot hide an earlier touch.
- The subsection carries its own `None — no files affected` sentinel, independent of the Architecture Snapshot's `None — no planned public surfaces` sentinel.
- Delta specs: `design-target-state` (Modified) and `design-interfaces-artifact` (Modified).
- `GLOSSARY.md` (project root) gains the `**File Manifest**` term: a `## Language` entry with `*Avoid*` aliases, a `## Relationships` link to **Target State** and **File Change Type**, and a `## Flagged ambiguities` resolution of the **Files Affected** vs **File Manifest** overload.

Non-goals:
- No change to `tasks.md`'s format, to the `A`/`M`/`D`/`R` **Files Affected** token vocabulary, or to the Architecture Snapshot feedback-presentation rule (`sai/instructions/design.md:230-232`) — it normalizes and diffs the whole `interfaces.md`, so the new subsection rides along unchanged.
- The manifest is not emitted anywhere other than `interfaces.md`, and no downstream phase parses it as authoritative input — `tasks.md` remains authoritative for per-step tokens and step attribution.
- No schema, template, or wrapper change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `design-target-state`: admits and defines the `### File Manifest` subsection under `## Target State` — its position as a sibling of `### Architecture Snapshot`, its content contract (net fold with written fold table, sort order, step attribution, separator rules, derivative clause), and its own `None` sentinel.
- `design-interfaces-artifact`: extends the admitted-section rule so `### File Manifest` is legal alongside `### Architecture Snapshot` without weakening the ban on non-`## Target State` / non-`## Step N` top-level sections.

## Impact

- **Modified files**:
  - `sai/instructions/design.md` — extend the `### Generate interfaces.md` section to mandate and define the `### File Manifest` subsection beneath `### Architecture Snapshot`.
  - `openspec/specs/design-target-state/spec.md` — via delta sync: File Manifest subsection admission, position, fold contract, and sentinel.
  - `openspec/specs/design-interfaces-artifact/spec.md` — via delta sync: admitted-section rule extension.
  - `GLOSSARY.md` — add the `**File Manifest**` term: `## Language` entry, `## Relationships` link, `## Flagged ambiguities` resolution.
- **No changes** to `tasks.md`'s format, the `tasks-scaffold-format` capability, the Architecture Snapshot feedback-presentation rule, `openspec/schemas/sai-workflow/`, the wrappers, or any consumer phase (`sai-3-implement`, `sai-4-apply`).

## Proposal Research Documentation

**Local files**:
- `sai/instructions/design.md` — `**Files Affected**` token vocabulary and derivation (:115); routing derivation and the `R` destination-only convention (:133-148); `### Generate interfaces.md`, `## Target State`, `### Architecture Snapshot` (:201-226); Architecture Snapshot feedback presentation (:228-232)
- `openspec/specs/design-target-state/spec.md` — `## Target State` content and None-sentinel requirements
- `openspec/specs/design-interfaces-artifact/spec.md` — admitted-section constraint (:25)
- `openspec/changes/archive/2026-08-07-declare-file-change-type-in-tasks/specs/tasks-scaffold-format/spec.md` — **Files Affected** token vocabulary and delta-spec MODIFIED format precedent
- `openspec/changes/archive/2026-07-09-design-emits-interfaces-artifact/proposal.md` — interfaces.md artifact precedent
- `openspec/specs/proposal-complexity/spec.md` — `**Complexity**` line contract
- `GLOSSARY.md` — existing domain terms (**Architecture Snapshot**, **File Change Type**, **Target State**, **Step Contract**)

**External URLs**: None

## Additional Notes

- The fold's one asymmetry: a path created and later deleted within the same change (A→D = ∅) appears in `tasks.md` but not in the manifest — correct for a target-state view and stated explicitly in the spec, since it is the only case where the two surfaces diverge.
- `tasks.md` stays authoritative for step attribution and per-step tokens; the manifest is declared derivative, reusing the wording already applied to the Architecture Snapshot ("a concise derivative review surface, not a replacement for the authoritative per-step contracts").
- The sort reuses the destination-only convention already fixed for routing derivation (`sai/instructions/design.md:135`): an `R` entry contributes only its destination path.
- The Architecture Snapshot answers "what public surfaces will exist"; the File Manifest answers "what files will change" — two orthogonal axes of the same target state, which is why they are siblings under `## Target State` rather than nested.
