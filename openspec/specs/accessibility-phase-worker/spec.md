# accessibility-phase-worker Specification

## Purpose
TBD

## Requirements

### Requirement: Accessibility worker owns the complete technical workflow

The accessibility worker SHALL own parent-branch detection, scope selection, UI-file detection, static WCAG 2.2 AA review, optional runtime review, report generation, report verification, self-critique, and the completed summary; change resolution, the `proposal.md` gate, argument validation, and the dev-server URL question SHALL belong to the shared audit coordinator `sai/commands/audit/coordinator.md`. OpenSpec environment prerequisite checks SHALL belong to `/sai-explore` alone and SHALL NOT be part of worker startup. The worker SHALL load `sai/commands/audit/worker-common.md` and `sai/commands/accessibility/steps/common.md` at creation together with its worker card, run the fileless `resolve-accessibility-scope` step from the brief and that surface before following the first pointer, and thereafter execute ONLY the step named by the coordinator's most recent `Active step:` pointer line — never prefetching, opening, or following any other step instruction file; the wholesale caller-neutral accessibility invocation core fetch chain SHALL NOT be part of the worker's instruction loading.

#### Scenario: Routed worker starts from an invocation envelope
- **WHEN** the accessibility worker receives its task brief naming the change, the options, and the report path
- **THEN** it performs the technical accessibility workflow from that brief and durable repository state without resolving the change or running OpenSpec environment prerequisite checks
- **AND** it returns the report path, counts, and summary rather than report contents in its result

#### Scenario: Sealed initial surface replaces the invocation-core fetch
- **WHEN** the accessibility worker is created
- **THEN** its initial surface references only its card, `sai/commands/audit/worker-common.md`, and `sai/commands/accessibility/steps/common.md`, with every other step path first arriving inside a coordinator `Active step:` pointer line
- **AND** the audit policy remains single-sourced across the carved step files

#### Scenario: Monolith is retired
- **WHEN** the step-gated accessibility delivery is in force
- **THEN** neither `sai/commands/accessibility/instructions.md` nor `sai/commands/accessibility/invocation.md` exists, and the install manifest carries a retirement for each installed copy

### Requirement: Worker preserves accessibility prerequisites, argument parsing, and scope behavior

The worker SHALL NOT parse `arguments_value`, resolve the change, or present a change picker: it SHALL take the change name and the options (the optional `--full` or `--path <dir>` scope, `--runtime`, `--url <url>`, and `--parent-branch <branch>`) from the coordinator's brief, which the coordinator has already validated against `sai/commands/accessibility/options.md` after verifying `proposal.md`. It SHALL NOT run or restate the OpenSpec CLI, `openspec/` directory, or `schema: sai-workflow` prerequisite checks. Parent-branch detection SHALL use the `--parent-branch` value first. It SHALL default to static review and ask no question without `--runtime`. It SHALL replace the audit with a Not Applicable report when the selected scope contains no UI files, even with `--runtime`.

#### Scenario: Proposal prerequisite is missing
- **WHEN** the selected change has no `openspec/changes/{change-name}/proposal.md`
- **THEN** the audit coordinator ends the run with its missing-proposal line before creating the worker
- **AND** no audit analysis runs and no `accessibility.md` is written

#### Scenario: Scope contains no UI files
- **WHEN** the selected diff contains no `.tsx`, `.jsx`, `.astro`, `.html`, `.vue`, `.svelte`, `.css`, or component-bearing markdown files
- **THEN** the worker writes `accessibility.md` with only its header and a justified `## Not Applicable` section, runs no scanner, and returns `completed`
- **AND** it does not create accessibility findings

#### Scenario: Runtime flag is absent
- **WHEN** the invocation does not include `--runtime`
- **THEN** the worker performs static review only and asks no question between change resolution and its close

### Requirement: Static accessibility review preserves WCAG policy and research delegation

The worker SHALL preserve the existing WCAG 2.2 Level AA scope, selected AAA targets only where committed by the project, Critical/High/Medium/Low/Informational severity vocabulary, native-first and no-speculation rules, accepted-trade-off handling, clean-category statements, and exact-evidence rule. A regression SHALL be classified High at minimum, or Critical when the Critical criteria apply; the retired `Major` term SHALL NOT appear in the instruction, the report contract, or the routed worker contract. Every finding SHALL include a precise location, WCAG Success Criterion code and name, severity, evidence, framework-aligned remediation, and a severity-prefixed identifier. When more than five UI files are in scope, the worker SHALL delegate per-component source inspection to `budget-explorer` subagents with explicit output contracts; it SHALL use those subagents in parallel only when independent component areas need codebase context, and total explorer invocations SHALL be capped at eight per audit.

#### Scenario: Independent UI areas exist
- **WHEN** the selected UI scope contains multiple independent component areas
- **THEN** the worker dispatches budget-explorer research for those areas in parallel
- **AND** each dispatch includes the required structured output contract and no raw code block output

#### Scenario: Static finding is reported
- **WHEN** static evidence identifies an accessibility issue
- **THEN** the report maps it to a specific WCAG Success Criterion, severity, and severity-prefixed identifier
- **AND** it quotes the exact offending source evidence with a precise location and remediation

#### Scenario: Category is clean
- **WHEN** an evaluated static category has no supported finding
- **THEN** the report states `No instances detected` for that category
- **AND** it does not invent a speculative finding

### Requirement: Worker writes and verifies only the accessibility artifact

The worker SHALL write and verify only `openspec/changes/{change-name}/accessibility.md`, using the existing accessibility report template. It SHALL never modify production code, components, styles, configuration, or runtime state. The completed report SHALL contain severity counts, a severity-prefixed identifier on every finding when there are any, a closing `Summary:` tally line whose counts match the report's findings, top three Critical/High findings when present, clean-category statements, exact evidence, a runtime-tools-used statement, a pending manual checks section, and a re-test checklist. The completed result SHALL carry the report path, the counts, a worker-authored summary, and `changed_files` containing only `accessibility.md`.

#### Scenario: Accessibility report completes
- **WHEN** static review and any runtime checks pass self-critique and report verification
- **THEN** `accessibility.md` exists, is non-empty, and contains only evidence-backed findings or explicit clean outcomes in the selected scope
- **AND** the worker returns `completed` with `accessibility.md` as its only changed file

### Requirement: Accessibility lifecycle results carry no time field

The accessibility worker SHALL return `step-done`, `question`, and terminal results with no time field, while retaining static review, runtime, and report-only write boundaries.

#### Scenario: Accessibility reports a milestone
- **WHEN** an accessibility step completes
- **THEN** its `step-done` result carries the step ids and no time field.

#### Scenario: Report generation would modify production files
- **WHEN** a proposed audit action would modify production code, components, styles, configuration, or runtime state
- **THEN** the worker rejects that action
- **AND** it continues to restrict writes to `accessibility.md`

### Requirement: Accessibility findings carry severity-prefixed identifiers and a closing summary tally

The accessibility instruction and report contract SHALL assign every finding a severity-prefixed identifier — the severity's initial followed by the finding's sequence within that severity in the current report (`C1`, `H1`, `M1`, `L1`, `I1` for `Informational`), with the sequence restarting at 1 for each severity at the start of every report. The accessibility report SHALL close with a `Summary:` line in the form `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Informational=<count>` whose counts match the report's findings. The five-level `Critical`/`High`/`Medium`/`Low`/`Informational` taxonomy SHALL remain unchanged.

#### Scenario: Finding carries a severity-prefixed identifier

- **WHEN** the accessibility report lists a finding
- **THEN** the finding heading leads with its severity-prefixed identifier
- **AND** identifiers restart at 1 per severity per report

#### Scenario: Report closes with the summary tally

- **WHEN** the accessibility report is complete
- **THEN** it closes with a `Summary:` line tallying `Critical`, `High`, `Medium`, `Low`, and `Informational` counts that match the listed findings

### Requirement: Accessibility close runs a pre-save adversarial findings check
The accessibility close step SHALL challenge the in-memory draft before saving to discard false positives and correct severity. It SHALL skip the adversary on zero findings, otherwise dispatch exactly one budget-explorer subagent receiving only per-finding identifier, file:line or selector, exact WCAG SC code plus level anchor, and one-line barrier description without diff or raw code, scope the adversary to current diff findings only, require per-finding keep or discard or downgrade verdict with why under 40 words and total report under 800 words, let the worker accept or reject each verdict with discards invisible and tally recomputed over kept findings at final severity, and close with worker findings on subagent failure without blocking.
#### Scenario: Adversarial check filters accessibility draft
- **WHEN** the in-memory accessibility draft contains findings
- **THEN** the worker runs one bounded adversary and saves only kept findings with recomputed Summary tally

### Requirement: Mapping step records five results with a checkable completion criterion

The `map-ui-framework` step SHALL be complete only when it has recorded five results: `UI files in scope`, `frameworks detected`, `component types`, `design tokens`, and `accepted trade-offs`, each as a list or `none`. Component types SHALL use the checklist trigger vocabulary `forms`, `media`, and `dynamic content`. Interactive widgets, navigation, and static content SHALL be identified as component types that trigger no checklist. Framework detection SHALL cover React, Astro, Tailwind, Vue (`.vue`), Svelte (`.svelte`), plain HTML/templates, and any other framework the UI files use.

#### Scenario: Mapping finds no design tokens
- **WHEN** the mapping step completes over a scope with UI files but no design tokens
- **THEN** it records all five results, with `design tokens` recorded as `none`

#### Scenario: Vue or Svelte file is in scope
- **WHEN** the selected scope contains a `.vue` or `.svelte` file
- **THEN** the mapping step records it in `UI files in scope` and its framework in `frameworks detected`, and the file is audited like any other UI file

### Requirement: Static-audit checklists declare triggers named by mapping results

Each static-audit checklist in `sai/commands/accessibility/steps/resolve-static-audit.md` SHALL open with a `Trigger:` line naming one mapping result. Semantics & Structure, ARIA & Naming, and Keyboard & Focus SHALL be `Trigger: always.`. Forms, Media & Non-Text Content, and Dynamic Content & SPA SHALL trigger when `component types` include `forms`, `media`, or `dynamic content` respectively. Visual Design SHALL trigger when `UI files in scope` include a CSS file or `design tokens` is not `none`. The `resolve-static-audit` step SHALL be complete only when every component in `component types` has been evaluated against every triggered checklist and, when Visual Design is triggered, every CSS file and design token as well. Every component type named in a `Trigger:` line MUST appear in the mapping step's component type list, and a structural test SHALL enforce that.

#### Scenario: CSS-only change triggers Visual Design
- **WHEN** the UI files in scope contain only a CSS file
- **THEN** the Visual Design checklist is triggered and the static audit is not complete until every CSS file and design token in scope has been evaluated

#### Scenario: No forms in scope
- **WHEN** the mapping step's `component types` do not include `forms`
- **THEN** the Forms checklist is not triggered, while the three always-triggered checklists still apply

#### Scenario: Trigger vocabulary drifts from the mapping list
- **WHEN** a `Trigger: component types include ...` line names a type absent from the mapping step's component type list
- **THEN** `test/accessibility-coordinator-worker.test.js` fails

### Requirement: Remediation and self-critique follow the detected frameworks

Every accessibility finding's remediation SHALL be aligned with the `frameworks detected` by the mapping step. The close step's "Framework idiom respected" self-critique check SHALL require fixes to follow the idioms of the `frameworks detected`, rather than naming React, Astro, or Tailwind only.

#### Scenario: Svelte component finding
- **WHEN** a finding is reported against a component in a `.svelte` file
- **THEN** its remediation and the self-critique evaluate the fix against Svelte idioms

### Requirement: Screen-reader statements are written as inferences

The worker SHALL write every statement about what a screen reader will announce or do as an inference prefixed `Inferred:`. The rule SHALL carry no exception for runtime observation.

#### Scenario: Finding describes a screen-reader announcement
- **WHEN** a finding states what a screen reader will announce for an element
- **THEN** that statement is prefixed `Inferred:`

### Requirement: Component-bearing markdown is defined in the accessibility common step file

`sai/commands/accessibility/steps/common.md` SHALL define component-bearing markdown once, beside the UI file list, as `.mdx` files plus `.md` files containing an HTML element or a capitalized component tag such as `<Button>`. A `.md` file containing neither SHALL NOT be a UI file.

#### Scenario: Plain markdown file in the diff
- **WHEN** the selected scope contains a `.md` file with no HTML element and no capitalized component tag
- **THEN** the worker does not treat it as a UI file

#### Scenario: Markdown file with a component tag
- **WHEN** the selected scope contains a `.md` file containing `<Button>`
- **THEN** the worker treats it as a UI file

### Requirement: Accessibility findings stay within the selected scope

The accessibility audit SHALL report findings only within the selected scope. A risk noticed outside the selected scope SHALL get at most a one-line note, never a finding or an audit.

#### Scenario: Risk outside the selected diff
- **WHEN** the auditor notices an accessibility risk in a file outside the selected scope
- **THEN** the report contains no finding for that file, and at most a one-line note

### Requirement: Runtime scanners run on --runtime alone

When `--runtime` is present, `--runtime` SHALL be the whole authorization for the runtime scanners: the worker SHALL ask no authorization question and SHALL never wait for an answer before running them. The scanners SHALL keep the `npx @axe-core/cli {url} --exit`, `npx pa11y {url} --reporter cli`, and `npx lhci autorun --only-categories=accessibility` invocations against the dev server at `--url`. The worker SHALL never retry a failed runtime command. A scanner that is not installed or fails to start, a missing `--url`, or a URL that does not respond SHALL be recorded as unavailable with its reason, and the static audit SHALL continue. Keyboard walks and screen-reader smoke tests SHALL be listed under the report's `## Pending Manual Checks` and never presented as verified, and runtime evidence SHALL be cross-referenced with static findings before reporting.

#### Scenario: Runtime checks are partially completed
- **WHEN** runtime mode is requested and one or more scanner commands are unavailable
- **THEN** the report distinguishes runtime mode from static-only mode and identifies the used and unavailable tools in its runtime-tools-used statement
- **AND** it does not claim evidence from any command that did not run

#### Scenario: Authorized scanner cannot reach the dev server
- **WHEN** a scanner command fails because the dev server at `--url` does not respond
- **THEN** the worker records that runtime check as unavailable using the command's observed result
- **AND** it does not convert the failure into an accessibility finding or retry automatically

#### Scenario: Runtime mode lacks a started server
- **WHEN** `--runtime` is present but the brief carries no `--url` because the user declined the coordinator's URL question
- **THEN** the worker does not invoke a browser scanner and asks no question
- **AND** it records the runtime part as unavailable and completes the static audit
