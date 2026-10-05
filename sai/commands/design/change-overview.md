# Change Overview Generation Instruction (shared contract)

Execute as a budget-routed generation subagent. This instruction is the single source of the generation contract for every generation and regeneration of `change-overview.md` — the same instruction governs every run, on every harness. The overview is a **derived projection, not a source of truth**: the five source artifacts remain authoritative and are never modified by generation.

## Write scope

Write exactly one file: `openspec/changes/{change-name}/change-overview.md`. The single-file write scope is strict: the generator writes ONLY this one artifact, and does NOT create, modify, or delete any other file — in particular none of the source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`), no project source file, no configuration file, and no other change artifact.

## Inputs

Read in parallel: `openspec/changes/{change-name}/proposal.md`, every file matching `openspec/changes/{change-name}/specs/**/*.md`, `openspec/changes/{change-name}/design.md`, `openspec/changes/{change-name}/tasks.md`, and `openspec/changes/{change-name}/interfaces.md`. The overview is derived ONLY from these five source artifacts — never from `implementation.md` or any implementation artifact, and never from conversation context.

## Rendering language

The parent design invocation supplies one invocation-scoped `overview_language` value to the generator only when `--overview-lang` is present and valid. Absent or invalid transport selects the no-generation route, never synthesizes `English`, and never overwrites a valid pre-existing overview with a precondition failure. Apply the faithful-copy rule below using that language. Source artifacts remain English and authoritative. Do not persist the value in `.openspec.yaml` or any other artifact. This rendering instruction does not change the five-field closed result envelope or the one-file write scope.

All actual Markdown headings and structural field labels remain English regardless of `overview_language`, including complete Step titles. Keep source headings and labels verbatim in English; use English structural wrappers `## Proposal`, `## Design`, `## Step N: <title>`, `### Interfaces`, and `### Tasks`. Structural field labels are section or field names such as `Goals`, `Provenance`, `Interfaces`, `Test assertions`, and `Files Affected`, not every emphasized explanatory phrase. Only explanatory prose is translated into the selected language. Heading-like text inside code is code, not a heading.

## Output organization

### Faithful-copy rule

Transfer the complete selected source content without summarizing, condensing, rewriting, or adding source content. Include every standalone paragraph, list item, reference, identifier, and selected field's complete content, including apparently redundant test assertions. Preserve Markdown formatting: lists and their order, tables and all rows, emphasis, links, blockquotes, fenced and indented blocks, and whitespace inside blocks. The only formatting exceptions are adjusting actual Markdown heading depth for the containing structure and wrapping Files Affected entries as defined below; heading-like text inside code blocks stays untouched. When the selected text is already in `overview_language`, copy it verbatim apart from those formatting exceptions. Otherwise translate only natural-language explanatory prose, preserving meaning and formatting under the English-heading and structural-label rule above. Keep code, public signatures, paths, identifiers, test expressions, commands, state values, source artifact names, result keys, and other technical literals unchanged, including inline code and code blocks. Apply this one rule to every mapping below.

### Source mappings and completion checks

1. **Proposal** — under `## Proposal`, copy only `## Why` and `## What Changes` from `proposal.md`, in source order, nesting their headings at `###`. Copy each complete subtree; omit other Proposal sections, including any `WHAT` heading. Completion: every selected heading and its complete content is present once, and no other Proposal content is copied.
2. **Design** — under `## Design`, copy all present sections of `design.md` in their original order, including additional sections not named in the template. Exclude sections named `Architecture Snapshot`, `File Manifest`, and `Context`, at any heading depth, with their complete subtrees. Keep remaining nested content in its source hierarchy, shifting source `##` headings to `###`. If `Target State` has no content left after exclusions, omit its heading too; retain it when selected prose or other subsections remain. Completion: every non-excluded section is copied completely in order, with no fixed allowlist of Design sections.
3. **Steps** — traverse every numbered `## Step N: <title>` in `tasks.md` in source order, not sorted numerically. Emit `## Step N: <title>` using that Tasks Step's number and title. Join the corresponding `interfaces.md` block by Step number, never by position or title:
   - When present, emit `### Interfaces`, containing only the complete `**Interfaces**` and `**Test assertions**` fields from that block in source order. Preserve their labels and all field content, including signatures, exact assertions, and spec citations; exclude other fields.
   - Then emit `### Tasks`, containing only the complete `**Files Affected**` field from the Tasks Step. Copy Files Affected literally, including repeated changes across Steps, deleted paths, and renames; it is not a global list or a net manifest fold. Keep the English field label outside one fenced `text` block containing all file entries for that Step. Preserve entry content exactly: change markers, paths (including literals such as `<timestamp>`), whitespace, order, and repetitions. Reuse an existing single fenced block rather than nesting or duplicating blocks; for bare, indented, or multiple source blocks, replace only their block wrappers with one `text` fence and preserve the entry contents. Choose a fence long enough to contain any literal fence in an entry. Keep any explanation of absence outside the file-entry block; absent entries do not require an empty block or an invented list.
   - When the Step has no Interfaces block, emit only its Tasks wrapper and Files Affected; invent neither interfaces nor assertions. Preserve any source explanation of absence alongside the selected content. If `interfaces.md` contains the whole-file `None — no step contracts` sentinel and its reason, copy them once immediately before the first Step, without adding a heading or inventing per-Step contracts.
   Completion: every Tasks Step appears once in source order with its own Files Affected and exactly its corresponding selected Interfaces content, if any. Non-Step Tasks sections and other Tasks fields are not copied.

**Absent sections and contradictions.** Omit absent selected sections or fields rather than filling placeholders; preserve a source explanation of absence when provided for selected content. Template placeholders are instructions, not output. Duplicate Step numbers in either source, an Interfaces Step number absent from Tasks, or conflicting source content are blocking contradictions: report both source locations and the one-line disagreement rather than correcting the sources or the overview. Missing Interfaces blocks alone are permitted. Read specs as corroborating sources for contradictions, not as additional overview content. The excluded design File Manifest does not supply overview files or require `file-manifest.js verify`; per-Step Files Affected is the selected source.

## Validation before write

Validate the complete candidate against every source-mapping completion check and the faithful-copy rule above. Confirm Proposal → Design → Tasks-ordered Step blocks (with the optional whole-file absence explanation before the Steps), exact section selection, complete content and preserved Markdown formatting, eligible translation with unchanged technical literals, omitted absent sections and empty Target State, and Step-number correspondence. Confirm that no selected content was dropped or added and no content contradicts a source. The Design section list is source-driven, not a fixed heading set.

Before accepting generation or regeneration, compare each selected source unit with its candidate counterpart: every standalone paragraph, list item, table row, reference, identifier, test assertion, and complete field content must be accounted for in source order. Check translated prose for complete meaning, and technical literals for exact equality. Section presence alone is insufficient: an omitted paragraph, citation, or apparently redundant assertion fails validation even when all headings are present. Confirm all headings (including full Step titles) and structural field labels remain English, while explanatory prose uses `overview_language`. For each Step with file entries, check exactly one file-entry text block, no duplicate or nested wrappers, and exact entry content including `<timestamp>`, change markers, paths, order, and repetitions. Confirm all other Markdown formatting is preserved. Any missing selected unit or failed candidate fidelity/rendering check prevents acceptance and returns `validation-failed` through the existing failure-record and result-envelope rules. Source contradictions remain `blocking-contradiction`, with both source locations and the one-line disagreement reported under the existing contradiction rules.

Acceptance remains transactional. Produce the complete new overview, validate it against the sources, and only then write `change-overview.md` in a single atomic write. A blocking contradiction or other failed generation or regeneration never leaves a partially written or partially validated candidate as the current overview: it fails without partial output. A generator-run failure may instead atomically write the complete diagnostic record defined below.

## Closed result envelope

The generator envelope is exactly five fields and no others:

    status: success | failed
    changed_files: string[]
    validation: passed | failed | not-performed
    failure_details: string
    failure_kind: none | blocking-contradiction | validation-failed | generation-error | dispatch-failed | envelope-contract-violation

Return exactly five mandatory fields:

- `status` — `success | failed`.
- `changed_files` — `[openspec/changes/{change-name}/change-overview.md]` when the generator writes the overview or a generator-owned failure record. `[]` is reserved for a parent-authored dispatch failure that occurred before dispatch was acknowledged; it is not a generator-run result. A dispatched process-loss or malformed/empty-envelope route is reported by the parent with the overview path because the file may have been affected before the result became untrustworthy.
- `validation` — `passed` or `failed` for a generator-run result. A parent-authored dispatch or contract-violation result uses `not-performed` because validation did not occur or cannot be trusted.
- `failure_details` — the empty string only on success; a non-empty English failure_details on every failure, naming what went wrong and the relevant source, artifact, envelope, dispatch, worker, or file location. A blocking contradiction names both conflicting source locations and the one-line disagreement.
- `failure_kind` — `none` on success; on failure one of `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, or `envelope-contract-violation`. The generator produces the first three failure values; the parent produces `dispatch-failed` for an unstarted dispatch, `generation-error` for process loss after dispatch, and `envelope-contract-violation` for a malformed or empty result.

The generator returns the five-field shape for every generator-run success or failure. When a generator-run failure occurs during first materialization or regeneration, it atomically writes a complete failure record to `change-overview.md` before returning the failed envelope. The failure record carries the exact `failure_kind` and non-empty `failure_details`; a first-materialization failure is still diagnostic state and is not a current overview. A failed regeneration record states that regeneration failed and that the overview is not current. The generator never writes any source artifact or any file other than `change-overview.md`.

The parent preserves the same five-field shape when it authors a dispatch, process-loss, or malformed/empty-envelope result. Parent-authored diagnostics remain English regardless of `overview_language` and are persisted by the design worker in the explicitly scoped `.openspec.yaml` keys `overview.failure_kind` and `overview.failure_details`.

The exact success shape is `status: success`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: passed`, `failure_details: ""`, and `failure_kind: none`. The exact generator-run failure shape is `status: failed`, an overview path in `changed_files`, `validation: failed`, non-empty English `failure_details`, and one generator failure kind. The exact parent dispatch-failure shape is `status: failed`, `changed_files: []`, `validation: not-performed`, non-empty `failure_details`, and `failure_kind: dispatch-failed`; process-loss parent routes use `generation-error` and report the potentially affected overview path. Malformed or empty parent routes use `failure_kind: envelope-contract-violation`, map to the same outer worker classification, and report the potentially affected overview path.

A valid generator failure kind propagates unchanged to the outer worker classification. A malformed or empty nested envelope remains a parent-authored five-field failure and maps to the outer worker classification `envelope-contract-violation`. Recovery metadata belongs only to the outer worker protocol and never enters this envelope.

Result-shape examples:

    status: success
    changed_files: [openspec/changes/{change-name}/change-overview.md]
    validation: passed
    failure_details: ""
    failure_kind: none

    status: failed
    changed_files: [openspec/changes/{change-name}/change-overview.md]
    validation: failed
    failure_details: "Validation failed at change-overview.md:48: required section is missing"
    failure_kind: blocking-contradiction | validation-failed | generation-error
