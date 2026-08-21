# Change Overview Generation Instruction (shared contract)

Execute as a budget-routed generation subagent. This instruction is the single source of the generation contract for every generation and regeneration of `change-overview.md` — the same instruction governs every run, on every harness. The overview is a **derived projection, not a source of truth**: the five source artifacts remain authoritative and are never modified by generation.

## Write scope

Write exactly one file: `openspec/changes/{change-name}/change-overview.md`. The single-file write scope is strict: the generator writes ONLY this one artifact, and does NOT create, modify, or delete any other file — in particular none of the source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`), no project source file, no configuration file, and no other change artifact.

## Inputs

Read in parallel: `openspec/changes/{change-name}/proposal.md`, every file matching `openspec/changes/{change-name}/specs/**/*.md`, `openspec/changes/{change-name}/design.md`, `openspec/changes/{change-name}/tasks.md`, and `openspec/changes/{change-name}/interfaces.md`. The overview is derived ONLY from these five source artifacts — never from `implementation.md` or any implementation artifact, and never from conversation context.

## Rendering language

The parent design invocation supplies one invocation-scoped `overview_language` value to the generator. Use that value for eligible generator-authored free-text prose and use `English` when the value is absent. Keep all nine top-level headings, the fixed `### Snapshot` heading, the fixed `#### External Surfaces` and `#### Internal Public Surfaces` headings, paths, commands, state values, source artifact names, generator result keys, and other source-controlled structural values unchanged. These headings are a closed English-fixed structural-anchor set and remain English regardless of `overview_language`; only eligible free-text prose may localize. Source artifacts remain English and authoritative; their content may be summarized in the overview without being rewritten. Do not persist the value in `.openspec.yaml` or any other artifact. This rendering instruction does not change the five-field closed result envelope or the one-file write scope.

## Output organization

Produce one structured approval document organized by capability and behavior, framed by approval-relevant concern and situation ? NOT a concatenation of the source documents. Its top-level sections SHALL be exactly these nine headings, in this order, with no additional top-level sections:

1. `## Change Proposal` ? the motivation narrative derived from `proposal.md`'s `## Why`; it carries no document-purpose preamble and does not restate scope or capabilities.
2. `## Scope` ? the in-scope and out-of-scope boundaries supported by the proposal and design artifacts.
3. `## Capabilities` ? the capabilities listed in `proposal.md`'s `## Capabilities`, with the capability specifications used to corroborate behavior; the generator does not synthesize a capability absent from the proposal.
   Generator-authored editorial `###` subsection headings under `## Capabilities` may be translated or localized; the top-level heading remains unchanged.
4. `## Target Architecture` ? an adapted, review-oriented rendering of the design Architecture Snapshot and relevant target-shape decisions, retaining concise ASCII notation in a `### Snapshot` subsection when the source contains it. Architecture Snapshot content is derived only from `design.md`.
    Generator-authored editorial `###` subsection headings under `## Target Architecture` may be translated or localized; the fixed `### Snapshot`, `#### External Surfaces`, and `#### Internal Public Surfaces` headings remain unchanged.
    For a non-empty source Architecture Snapshot, render exactly two nested headings under the fixed `### Snapshot` heading, in this order: `#### External Surfaces`, then `#### Internal Public Surfaces`. Put external entries and source-grounded prose under `#### External Surfaces`, and internal entries and source-grounded prose under `#### Internal Public Surfaces`. The content may be condensed under the fidelity rules, but must not be flattened, reversed, or invented. If the source Architecture Snapshot is entirely `None — no planned public surfaces`, omit that shared whole-inventory sentinel and emit neither nested heading. If exactly one boundary is empty, still render both nested headings in order and retain the source-grounded block-specific sentinel under the correct heading; never replace it with the shared whole-inventory sentence.
5. `## Key Contracts` ? approval-relevant behavioral contracts grouped by concern, derived from design decisions and capability requirements; public signatures and method-level test assertions are not rendered here.
6. `## File Manifest` ? the file-level change inventory, validated against the deterministic fold and persisted design manifest. Thematic `###` subsections may group entries, and related interface signatures appear beside their surviving manifest file entries. Net-empty paths are omitted from the overview, and signatures for those paths are not rendered.
7. `## Review Scenarios` ? approval-relevant behavioral scenarios grouped by situation or outcome. Scenarios may be condensed and need not be reproduced verbatim.
8. `## Implementation Approach` ? a condensed ordered approach derived from design and tasks, without reproducing step-level task prose blocks.
9. `## Approval Summary` ? source-grounded decisions, constraints, trade-offs, and review implications needed to approve the change.

Within any of the nine top-level sections, the generator MAY emit `###` subsections for editorial grouping. The fixed `### Snapshot` subsection remains required when the source Architecture Snapshot contains concise ASCII notation; for a non-empty source Architecture Snapshot, its two fixed nested boundary headings remain required in external-first, internal-second order. Other generator-authored editorial subsection headings, including headings under `## Capabilities` and `## Target Architecture`, may be translated or localized as eligible prose. The nine top-level headings, `### Snapshot`, `#### External Surfaces`, and `#### Internal Public Surfaces` remain unchanged as English structural anchors, subject to the empty-source omission rule above.

The overview SHALL NOT emit `## Target State`, `## Requirements`, `## Scenarios`, `## Interfaces`, `## Assertions`, `## File Changes`, `## Delivery Steps`, `## Traceability` as separate top-level sections. The manifest appears only under `## File Manifest`; interface signatures appear only beneath their related surviving file entries there.

## Fidelity rules

- The five source artifacts remain authoritative. The overview may group and condense their content by approval-relevant concern, situation, capability, or behavior, but editorial placement is not a new source relationship.
- Do not state a fact, requirement, scenario outcome, interface contract, file change, implementation step, trade-off, or conclusion absent from `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, or `interfaces.md`.
- Do not silently reword normative source content in a way that strengthens, weakens, or changes its meaning. Summarized substantive content identifies its source artifact; authoritative wording remains in the source.
- The generator does not invent interface mappings, end-to-end traceability, gap reports, or standalone audit sections merely to preserve the former projection.
- Do not modify any source artifact; do not silently repair or invent source semantics to resolve gaps or contradictions.
- Blocking contradictions are reported with both source locations and the one-line disagreement. The deterministic `tasks.md` manifest fold versus the persisted `design.md` File Manifest remains a manifest contradiction and a blocking contradiction; transactional validation fails without partial output.

## Validation before write

Validate the complete candidate overview before writing: the exact nine required top-level sections are present in order, the manifest fold matches the persisted design manifest, every substantive statement is grounded in one or more source artifacts, and no statement contradicts a source. Validation does not require verbatim requirement or scenario wording, method-level assertions, an end-to-end traceability block, or a gap report.

Acceptance remains transactional. Produce the complete new overview, validate it against the sources, and only then write `change-overview.md` in a single atomic write. A manifest contradiction or other failed generation or regeneration never leaves partially written or partially validated output as the current overview: it fails without partial output.

## Closed result envelope

The generator envelope is exactly five fields and no others:

    status: success | failed
    changed_files: string[]
    validation: passed | failed | not-performed
    failure_details: string
    failure_kind: none | blocking-contradiction | validation-failed | generation-error | dispatch-failed

Return exactly five mandatory fields:

- `status` — `success | failed`.
- `changed_files` — `[openspec/changes/{change-name}/change-overview.md]` when the generator writes the overview or a generator-owned failure record. `[]` is reserved for a parent-authored dispatch failure that occurred before dispatch was acknowledged; it is not a generator-run result. A dispatched process-loss or malformed/empty-envelope route is reported by the parent with the overview path because the file may have been affected before the result became untrustworthy.
- `validation` — `passed` or `failed` for a generator-run result. A parent-authored dispatch or contract-violation result uses `not-performed` because validation did not occur or cannot be trusted.
- `failure_details` — the empty string only on success; a non-empty English failure_details on every failure, naming what went wrong and the relevant source, artifact, envelope, dispatch, worker, or file location. A blocking contradiction names both conflicting source locations and the one-line disagreement.
- `failure_kind` — `none` on success; on failure one of `blocking-contradiction`, `validation-failed`, `generation-error`, or `dispatch-failed`. The generator produces the first three values; the parent produces `dispatch-failed` and may classify process loss as `generation-error`.

The generator returns the five-field shape for every generator-run success or failure. When a generator-run failure occurs during first materialization or regeneration, it atomically writes a complete failure record to `change-overview.md` before returning the failed envelope. The failure record carries the exact `failure_kind` and non-empty `failure_details`; a first-materialization failure is still diagnostic state and is not a current overview. A failed regeneration record states that regeneration failed and that the overview is not current. The generator never writes any source artifact or any file other than `change-overview.md`.

The parent preserves the same five-field shape when it authors a dispatch, process-loss, or malformed/empty-envelope result. Parent-authored diagnostics remain English regardless of `overview_language` and are persisted by the design worker in the explicitly scoped `.openspec.yaml` keys `overview.failure_kind` and `overview.failure_details`.

The exact success shape is `status: success`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: passed`, `failure_details: ""`, and `failure_kind: none`. The exact generator-run failure shape is `status: failed`, an overview path in `changed_files`, `validation: failed`, non-empty English `failure_details`, and one generator failure kind. The exact parent dispatch-failure shape is `status: failed`, `changed_files: []`, `validation: not-performed`, non-empty `failure_details`, and `failure_kind: dispatch-failed`; process-loss parent routes use `generation-error` and report the potentially affected overview path, while malformed or empty parent routes map to the outer worker classification `envelope-contract-violation` and report the potentially affected overview path.

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
