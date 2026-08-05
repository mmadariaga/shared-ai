# accessibility-phase-worker Specification

## Purpose
TBD

## Requirements

### Requirement: Accessibility worker owns the complete technical workflow

The routed accessibility worker SHALL own envelope parsing, prerequisites, change resolution, parent-branch detection, scope selection, UI-file detection, static WCAG 2.2 AA review, optional runtime review, report generation, report verification, self-critique, and lifecycle summary creation. The routed worker and the Copilot inline caller SHALL use the same caller-neutral accessibility invocation core so that the audit policy remains aligned across supported harnesses.

#### Scenario: Routed worker starts from an invocation envelope
- **WHEN** the accessibility worker receives the harness envelope
- **THEN** it performs the complete technical accessibility workflow from that envelope and durable repository state
- **AND** it returns artifact paths and summary metadata rather than report contents in lifecycle payloads

#### Scenario: Copilot starts inline accessibility
- **WHEN** the Copilot inline accessibility path starts
- **THEN** it uses the same accessibility invocation core and instruction source as the routed worker
- **AND** its technical audit behavior remains aligned with the routed path

### Requirement: Worker preserves accessibility prerequisites, argument parsing, and scope behavior

Before analysis, the worker SHALL enforce the existing OpenSpec CLI, `openspec/` directory, `schema: sai-workflow`, and required `proposal.md` prerequisites. It SHALL preserve the existing argument contract: one required change-name positional, optional `--full` or `--path {dir}` scope flag, optional `--runtime` flag, and optional trailing parent-branch value. It SHALL also preserve change selection behavior and parent-branch detection order. It SHALL default to static review, skip the audit with the existing one-line outcome when the selected diff contains no UI files, and write no report when the proposal prerequisite is missing.

#### Scenario: Proposal prerequisite is missing
- **WHEN** the selected change has no `openspec/changes/{change-name}/proposal.md`
- **THEN** the worker returns the existing actionable missing-proposal failure
- **AND** it performs no audit analysis and writes no `accessibility.md`

#### Scenario: Scope contains no UI files
- **WHEN** the selected diff contains no `.tsx`, `.jsx`, `.astro`, `.html`, `.vue`, `.svelte`, `.css`, or component-bearing markdown files
- **THEN** the worker records the existing one-line skipped-audit outcome
- **AND** it does not create accessibility findings

#### Scenario: Runtime flag is absent
- **WHEN** the invocation does not include `--runtime`
- **THEN** the worker performs static review only
- **AND** it executes no browser or scanner command

### Requirement: Static accessibility review preserves WCAG policy and research delegation

The worker SHALL preserve the existing WCAG 2.2 Level AA scope, selected AAA targets only where committed by the project, Critical/High/Medium/Low/Informational severity vocabulary, native-first and no-speculation rules, accepted-trade-off handling, clean-category statements, and exact-evidence rule. Any regression covered by the legacy "at least Major" rule SHALL be classified High at minimum, or Critical when Critical criteria apply; `Major` SHALL NOT be emitted. Every finding SHALL include a precise location, WCAG Success Criterion code and name, severity, evidence, and framework-aligned remediation. When more than five UI files are in scope, the worker SHALL delegate per-component source inspection to `budget-explorer` subagents with explicit output contracts; it SHALL use those subagents in parallel only when independent component areas need codebase context, and total explorer invocations SHALL be capped at eight per audit.

#### Scenario: Independent UI areas exist
- **WHEN** the selected UI scope contains multiple independent component areas
- **THEN** the worker dispatches budget-explorer research for those areas in parallel
- **AND** each dispatch includes the required structured output contract and no raw code block output

#### Scenario: Static finding is reported
- **WHEN** static evidence identifies an accessibility issue
- **THEN** the report maps it to a specific WCAG Success Criterion and severity
- **AND** it quotes the exact offending source evidence with a precise location and remediation

#### Scenario: Category is clean
- **WHEN** an evaluated static category has no supported finding
- **THEN** the report states `No instances detected` for that category
- **AND** it does not invent a speculative finding

### Requirement: Runtime checks require individual worker authorization

When `--runtime` is present, the worker SHALL require that the user has started the dev server and SHALL request authorization through the worker's closed `needs_input` lifecycle payload before every individual runtime command. The authorization loop SHALL be finite and non-batched: it SHALL present at most one authorization question for each applicable scanner command in the fixed runtime checklist. The worker SHALL never auto-execute or automatically retry a runtime command. Authorized scanner commands SHALL preserve the existing `npx @axe-core/cli {url} --exit`, `npx pa11y {url} --reporter cli`, and `npx lhci autorun --only-categories=accessibility` invocations. Keyboard walks and screen-reader smoke tests SHALL remain explicit user-verified checks, and runtime evidence SHALL be cross-referenced with static findings before reporting.

#### Scenario: Runtime scanner needs authorization
- **WHEN** runtime mode reaches an individual scanner command after the dev server is available
- **THEN** the worker returns `needs_input` with the command-specific question and ordered authorize/skip options
- **AND** it does not execute the command before the user selects an option

#### Scenario: User authorizes one scanner command
- **WHEN** the user selects authorize for one runtime scanner command
- **THEN** the worker executes only that authorized command
- **AND** it requests a new authorization before any subsequent command

#### Scenario: User skips one scanner command
- **WHEN** the user selects skip for one runtime scanner command
- **THEN** the worker does not execute that command
- **AND** it continues without treating the skipped command as runtime evidence

#### Scenario: Runtime checks are partially completed
- **WHEN** runtime mode is requested and one or more scanner commands are skipped or unavailable
- **THEN** the report distinguishes runtime mode from static-only mode and identifies the used, skipped, or unavailable tools in its runtime-tools-used statement
- **AND** it does not claim evidence from any command that did not run

#### Scenario: Authorized scanner cannot reach the dev server
- **WHEN** an authorized scanner command fails because the dev server is unavailable
- **THEN** the worker records that runtime check as unavailable using the command's observed result
- **AND** it does not convert the failure into an accessibility finding or retry automatically

#### Scenario: Runtime mode lacks a started server
- **WHEN** `--runtime` is present but the user has not started the dev server
- **THEN** the worker does not invoke a browser scanner
- **AND** it returns `needs_input` asking the user to start and confirm the dev server, with an option to skip runtime checks
- **AND** it proceeds without runtime evidence when the user selects the skip option

### Requirement: Worker writes and verifies only the accessibility artifact

The worker SHALL write and verify only `openspec/changes/{change-name}/accessibility.md`, using the existing accessibility report template. It SHALL never modify production code, components, styles, configuration, or runtime state. The completed report SHALL contain severity counts, top three Critical/High findings when present, clean-category statements, exact evidence, a runtime-tools-used statement, and a re-test checklist. The completed lifecycle result SHALL carry the canonical change name, report path, worker-authored summary, and `changed_files` containing only `accessibility.md`.

#### Scenario: Accessibility report completes
- **WHEN** static review and any authorized runtime checks pass self-critique and report verification
- **THEN** `accessibility.md` exists, is non-empty, and contains only evidence-backed findings or explicit clean outcomes in the selected scope
- **AND** the worker returns `completed` with `accessibility.md` as its only changed file

#### Scenario: Report generation would modify production files
- **WHEN** a proposed audit action would modify production code, components, styles, configuration, or runtime state
- **THEN** the worker rejects that action
- **AND** it continues to restrict writes to `accessibility.md`
