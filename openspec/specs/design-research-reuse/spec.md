# design-research-reuse Specification

## Purpose
Make `/sai-2-design` research start from the evidence the change already carries and investigate only the gaps that design needs verified.

## Requirements

### Requirement: Design research starts from existing evidence

The design research step SHALL start from the evidence already available: `proposal.md` including `## Proposal Research Documentation`, the specs, the inherited research when the brief carries it, and on a rerun the existing design artifacts. It SHALL research only gaps: the files the design changes, their callers, the tests that cover them, and any fact that is missing, contradictory, or possibly stale. Gap research SHALL be delegated to `budget-explorer` with a prompt that names the gaps to verify; the design worker SHALL NOT search or open source files itself.

#### Scenario: Explorer receives only the gaps
- **WHEN** the design worker launches research after reading the proposal, its research documentation, the specs, and any inherited research
- **THEN** the `budget-explorer` prompt asks it to verify only the named gaps rather than rediscover the codebase

### Requirement: Stale cited paths are researched, never trusted

A path cited in the prior evidence that no longer exists or now points at unrelated content SHALL count as a gap and SHALL be researched.

#### Scenario: Cited path no longer matches
- **WHEN** a path cited in the proposal's research documentation no longer exists or points at unrelated content
- **THEN** design treats it as a gap and researches it instead of trusting the citation

### Requirement: Missing proposal research documentation blocks nothing

A `proposal.md` without `## Proposal Research Documentation` SHALL NOT block design; the design worker SHALL research the gaps from the specs.

#### Scenario: Backfilled proposal without research documentation
- **WHEN** design runs on a proposal that has no `## Proposal Research Documentation` section
- **THEN** design proceeds and researches the gaps from the specs

### Requirement: Design research completes when changed files, callers and tests are verified

The design research step SHALL be complete only when every file the design changes, its callers, and its tests are verified, inherited research counting as verified. When directly affected callers, tests, or claims remain unverified, the worker SHALL continue with a targeted `budget-explorer` request before closing the step.

#### Scenario: Unverified caller remains
- **WHEN** a caller of a file the design changes is still unverified after the first research report
- **THEN** the worker issues a targeted `budget-explorer` request before closing the research step

### Requirement: Design consumes inherited spec research first

Inside `/sai-plan`, when the design brief carries an `inherited research:` list of `<path> <sha256>` pointers, the design research step SHALL trust those pointers with no freshness check, because the coordinator already verified them. It SHALL read `spec-annotations.md` first when the list holds it; an annotation SHALL prevail over the report it contradicts, with no explorer spent on it. It SHALL open a saved report only when it needs its detail for a design decision, and SHALL dispatch explorers only for the design's own gaps and for each `gap` entry of the annotations; a path or claim that no pointer covers SHALL be a gap. Run alone, the brief SHALL carry no such list and this requirement SHALL NOT apply.

#### Scenario: an annotation prevails over its report

- **WHEN** `spec-annotations.md` marks a claim of a saved explorer report as `corrected`
- **THEN** design uses the annotation and dispatches no explorer to settle that claim

#### Scenario: a gap entry is researched

- **WHEN** the annotations carry a `gap` entry
- **THEN** design dispatches a `budget-explorer` for that gap

#### Scenario: standalone design inherits nothing

- **WHEN** `/sai-2-design` runs alone
- **THEN** its brief carries no `inherited research:` list and design researches as before
