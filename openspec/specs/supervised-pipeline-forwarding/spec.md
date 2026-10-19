# supervised-pipeline-forwarding Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Forward Plan envelopes unchanged

Plan - Unattended SHALL preserve the one-string supervised worker envelope and existing chained phase forwarding. Its spec request SHALL use the supervised marker followed by the paired stored-file and hash references instead of inline stored text. Design forwarding SHALL remain name-first with its existing fast-track, supervised, and optional language flags.

#### Scenario: Plan forwards a worker request

- **WHEN** Plan dispatches a supervised worker
- **THEN** the existing one-string envelope is forwarded with the spec block delivered through the paired file/hash reference and the existing chained design protocol preserved.

### Requirement: Forward supervised marker on Auto dispatches

Explore-supervised Plan requests SHALL carry `--supervised` within the sole `arguments_value` field. The spec request SHALL begin with `--supervised`, then `--block-file <absolute path>` and `--block-hash <sha256>` from a fresh stored export, without inline block text. After verification the file SHALL supply the complete request. Chained design and design-only retry requests SHALL keep `{name} --fast-track --supervised` or the equivalent inverse flag order and repeat `--overview-lang <language>` when selected. Manual SHALL dispatch nothing and inject no supervised, fast-track, or language flags. No wrapper-echo or third envelope field SHALL be introduced.

#### Scenario: Auto spec dispatch carries the marker

- **WHEN** Auto starts a supervised run for a change whose spec phase has not yet converged or exhausted
- **THEN** `arguments_value` begins with the line `--supervised`, followed by the paired `--block-file` and `--block-hash` lines without inline block text
- **AND** after reference verification the file supplies the complete crystallized `Ready to Propose` block as the verbatim request

#### Scenario: Auto chained design dispatch carries the marker

- **WHEN** Auto chains design after a non-`failed`/`cancelled` spec ending
- **THEN** `arguments_value` is of the shape `{name} --fast-track --supervised` or `{name} --supervised --fast-track` (plus `--overview-lang {overview_language}` when selected)
- **AND** `--supervised` need not be the first token

#### Scenario: design-phase retry carries the marker

- **WHEN** a later Auto selection retries only the design phase over existing reviewed spec artifacts
- **THEN** the design dispatch includes `--supervised` exactly as the normal chained design dispatch does
- **AND** it does not reintroduce an automatic worker-owned reviewer by omitting the marker

#### Scenario: Manual forwards no supervised marker

- **WHEN** the user selects Manual on the crystallization-close pipeline selector
- **THEN** explore dispatches no phase worker
- **AND** no `--supervised` flag is injected into any later independent invocation by that Manual selection

#### Scenario: marker is not a third envelope field

- **WHEN** any Auto dispatch envelope is constructed
- **THEN** the request consists only of `arguments_value`
- **AND** `--supervised` appears only as flag content inside that string

### Requirement: Preserve chained forwarding

When `sai-explore` runs selector-dispatched `Auto` supervision with an explicit `--overview-lang <language>` or with gate 9 selecting a language, it SHALL retain the value only in invocation-scoped supervised state and SHALL include the same flag and value in the chained `sai-2-design` worker request. When gate 9 resolves do not create, the chain SHALL omit the language flag and remain unopted-in. `Manual` SHALL forward nothing. The existing chained fast-track behavior SHALL remain active. The supervised marker forwarding defined by `Forward supervised marker on Auto dispatches` SHALL compose with this requirement: a language-bearing chained design request SHALL carry `--fast-track`, `--supervised`, and `--overview-lang <language>` together; a do-not-create chained design request SHALL carry `--fast-track` and `--supervised` without a language flag and SHALL not dispatch overview generation.

#### Scenario: Selected language reaches chained design

- **WHEN** Auto starts a supervised run with `--overview-lang spanish`
- **THEN** the chained design request includes `--overview-lang spanish` alongside its existing `--fast-track` behavior and the `--supervised` marker
- **AND** the design worker generates the overview in `spanish`

#### Scenario: Do-not-create selection omits the overview flag

- **WHEN** gate 9 resolves do not create before Auto starts a supervised run
- **THEN** the chained design request contains no language flag or language value and retains `--fast-track` and `--supervised`
- **AND** the design worker does not dispatch the overview generator or create a new overview lifecycle transition solely for the omission

#### Scenario: Gate-selected language reaches chained design

- **WHEN** gate 9 selects `spanish` and Auto starts a supervised run
- **THEN** the chained design request includes `--overview-lang spanish` alongside `--fast-track` and `--supervised`
- **AND** the design worker generates the overview in `spanish`

#### Scenario: Manual remains unforwarded

- **WHEN** the user selects Manual on the crystallization-close pipeline selector
- **THEN** explore dispatches no phase worker and forwards no overview-language state to a later isolated invocation

#### Scenario: Unselected language preserves the existing chain
- **WHEN** Auto runs without an overview-language selection
- **THEN** the existing chained design request remains otherwise unchanged

### Requirement: Do not persist language across isolated chats

The normal non-supervised explore flow SHALL not persist or inject an overview language into a later isolated `sai-2-design` invocation. Users SHALL provide the flag again when starting a separate design invocation. A later design invocation without the flag SHALL skip overview generation rather than defaulting to English or reusing an earlier language; a language selected by gate 9 is forwarded only through the active Auto chain.

#### Scenario: Normal explore transition does not carry language

- **WHEN** an explore invocation uses `--overview-lang spanish` without an `Auto` selection and the user later starts `sai-2-design` in a new isolated chat without the flag
- **THEN** the later design invocation has no Spanish language state
- **AND** it does not generate or regenerate an overview

#### Scenario: No persisted language field is created

- **WHEN** a supervised or isolated explore invocation uses `--overview-lang spanish`
- **THEN** no `overview.language` or equivalent language preference is written to `.openspec.yaml` or any other change artifact

#### Scenario: Failed or cancelled design retry requires the flag again

- **WHEN** a supervised design phase fails or is cancelled and a later invocation retries the pipeline
- **THEN** the later invocation does not reuse the earlier language
- **AND** it must supply `--overview-lang <language>` again to request localization and overview generation

### Requirement: Forward only the supervised Auto language

The supervised chain SHALL forward a non-`None` language only from explicit `--overview-lang` input or gate 9 resolved by displayed `Plan - Unattended`. `Manual` SHALL forward nothing, and `Direct Build - Unattended` SHALL not generate an overview.

#### Scenario: Language forwarding follows route selection

- **WHEN** displayed supervised Auto selects or receives a non-`None` language
- **THEN** the chained design envelope includes `--fast-track --supervised --overview-lang <language>` and other routes receive no overview dispatch

### Requirement: Preserve no-language retry behavior

When the language resolves to `None`, the chained design envelope SHALL omit `--overview-lang` while retaining its existing supervised and fast-track markers.

#### Scenario: None remains omitted from the design envelope

- **WHEN** supervised Auto resolves the overview decision to `None`
- **THEN** the design envelope contains `--fast-track --supervised` without an overview-language option
