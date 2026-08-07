**Complexity**: medium (1 modified capability, 3 requirements, 5 affected paths, no breaking change, no new dependency)

## Why

**Files Affected** in `tasks.md` is a bare comma-separated path list without a verb, so a plan that creates five files and another that modifies three are visually identical — verified against two real plans (`enforce-audit-step-append-verification` in this repo, all modifications; `add-step-up-authentication-for-site-unassignment` in CVL.SmartLocks, five new files in Step 1) and their git history. The change type only exists in the prose of **What Will Be Done**, where it is unreliable at file level: "Add the audit-append bullet" is a modification while "Add step-up primitives" is five new files, and "Move secure-devices to the unified prefix" moves an HTTP route, not a file. The schema already half-recognizes the distinction ("to be modified or created") without requiring it and without covering deletion (`openspec/schemas/sai-workflow/schema.yaml:118`).

## What Changes

- `**Files Affected**` entries in `tasks.md` change from a comma-separated path list to **one entry per line**, each starting with exactly one change-type token from a closed four-letter vocabulary: `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed). An `R` entry carries the source path and the destination path in git-style form `R <source path> -> <destination path>`.
- Consumers of the sub-field read the path after the leading token; the **Routing** derivation keeps matching the same path patterns and produces identical tokens for `A`/`M`/`D` entries, and derives from the destination path of `R` entries (routing describes where the step's work lands, so a single-file move never flips the step's layer or discipline tokens); the `/sai-4-apply` plan cross-check keeps matching paths.
- Updated surfaces: `sai/instructions/design.md` (Files Affected format line and routing-derivation wording), `openspec/schemas/sai-workflow/schema.yaml` (tasks artifact instruction), `openspec/schemas/sai-workflow/templates/tasks.md` (step skeleton).
- Delta spec updates the `tasks-artifact-format` and `schema-tasks-instruction-updated` requirements of `tasks-scaffold-format`, and adds a new `tasks-design-instruction-updated` requirement covering `sai/instructions/design.md`.
- `GLOSSARY.md` gains the term **File Change Type**, resolving the "change type" vs "OpenSpec change" overload.
- Archived `tasks.md` files keep the old format; the absence of change-type tokens there is not a violation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `tasks-scaffold-format`: the `**Files Affected**` sub-field format changes from a comma-separated list of paths to one entry per line with a change-type token (`A`/`M`/`D`/`R`); the schema instruction and template gain the new format; a new requirement covers the `sai/instructions/design.md` instruction text.

## Impact

- `sai/instructions/design.md` — Files Affected format definition (line 110) and the routing-derivation section (lines 126-154, prefix-ignoring rule).
- `openspec/schemas/sai-workflow/schema.yaml` — tasks artifact instruction text (line 118).
- `openspec/schemas/sai-workflow/templates/tasks.md` — Files Affected skeleton lines (5, 17).
- `GLOSSARY.md` — new **File Change Type** term, one relationship line, one flagged ambiguity.
- `openspec/specs/tasks-scaffold-format/spec.md` — merge target of the delta specs at archive time (not edited directly by this change).
- Consumers that keep working unchanged: `tasks-routing-metadata` (path-pattern derivation), `atomic-commit-planning` (path-set semantics), `apply-pre-commit-file-report` (agent-executed path matching), `sai/instructions/apply.md` (wording stays misaligned by accepted trade-off; correction out of scope).

## Proposal Research Documentation

**Local files**:

- `sai/instructions/design.md` — Files Affected format (line 110); routing derivation reading `**Files Affected**` paths (lines 126-154); atomic-commit planning path-list references (lines 163, 174)
- `openspec/schemas/sai-workflow/schema.yaml` — tasks artifact instruction (line 118)
- `openspec/schemas/sai-workflow/templates/tasks.md` — Files Affected skeleton (lines 5, 17)
- `openspec/specs/tasks-scaffold-format/spec.md` — normative format (line 16) and closed five-sub-field clause (line 28)
- `openspec/specs/apply-pre-commit-file-report/spec.md` — Plan cross-check contract and scenarios (lines 41, 49, 77)
- `openspec/specs/tasks-routing-metadata/spec.md` — routing derivation from Files Affected paths (lines 12, 53-91, 165)
- `openspec/specs/atomic-commit-planning/spec.md` — Files Affected path-set semantics (lines 10-84)
- `sai/instructions/apply.md` — Plan cross-check consumer (line 386)
- `GLOSSARY.md` — existing **Routing Layer** / **Routing Discipline** terms and relationships
- `openspec/changes/archive/2026-08-06-enforce-audit-step-append-verification/tasks.md` — real plan, all-modification steps
- `C:/Projects/Dorlet/CVL.SmartLocks/openspec/changes/archive/2026-07-08-add-step-up-authentication-for-site-unassignment/tasks.md` — real plan, five new files in Step 1, format-indistinguishable from the above

**External URLs**: None.

## Additional Notes

- The `/sai-4-apply` Plan cross-check is agent-executed path matching: it keeps working because the agent reads the path after the leading token. The accepted trade-off is that `sai/instructions/apply.md:386` keeps describing the sub-field as a "line" in singular — wording misalignment without behavior breakage; its correction is deliberately out of scope.
- The token-stripping obligation in the delta spec is deliberately not mirrored into `openspec/specs/apply-pre-commit-file-report/spec.md` — that spec's wording is knowingly left behind, the same shape as the `apply.md:386` trade-off, so the omission reads as a decision rather than an oversight; its correction is out of scope.
- No sixth `## Step N` sub-field is introduced: the closed five-sub-field set (`Routing`, Files Affected, What Will Be Done, Testing Strategy, Existing Tests Broken) is preserved. This is a format change of the existing Files Affected field.
- An `R` entry is a single entry with source and destination — never a `D` plus an `A` pair — so the move link between the two paths is not lost. `R` covers both pure relocations and relocations that rewrite content: the token carries no similarity index, and the extent of content change is described in the step's `**What Will Be Done**` prose.
- Out of scope: `interfaces.md`, the `### Architecture Snapshot`, and any behavior change in `/sai-4-apply`.
- The global file aggregate in the final summary of `/sai-2-design` stays out of scope; this change is the prerequisite that makes it derivable without guessing.
- `**Files Affected**` shifts from an inventory ("which files does this step touch") to a plan ("what happens to each file"), the granularity at which the rest of `## Step N` already reasons; the change-type token declares what happens to the file in the step's commit, not what the code inside it does.
