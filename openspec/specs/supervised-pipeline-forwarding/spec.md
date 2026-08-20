# supervised-pipeline-forwarding Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Forward supervised marker on Auto dispatches

When `sai-explore` runs selector-dispatched `Auto` supervision, it SHALL include the literal flag `--supervised` in every phase-worker dispatch envelope it constructs for that supervised run. The marker SHALL ride as flag content on `arguments_value` inside the existing two-string envelope. Explore SHALL leave `wrapper_echo_value` empty on every Auto phase-worker dispatch so `arguments_value` remains the selected source under existing wrapper-echo precedence; explore SHALL NOT supply the marker as a bare non-empty `wrapper_echo_value` that would supersede and discard the crystallized request. No third envelope field SHALL be introduced.

Phase-specific placement (two grammars, one marker token):

- The initial `sai-1` spec-proposal dispatch SHALL set `wrapper_echo_value` empty and set `arguments_value` to the leading flag line `--supervised`, a newline, then the complete `Ready to Propose` block, so after the spec worker's line-wise flag strip the verbatim request is still that full block.
- The chained `sai-2` design dispatch SHALL set `wrapper_echo_value` empty and SHALL reuse the existing name-first flag mechanism, forming `arguments_value` of the shape `{name} --fast-track --supervised` and, when an overview language was selected, additionally `--overview-lang {overview_language}`. The design worker does not require `--supervised` to be the first token.
- A design-phase retry that re-dispatches only the design worker SHALL carry `--supervised` exactly as the normal chained design dispatch does (empty echo, same `arguments_value` shape), and SHALL still supply `--overview-lang {overview_language}` again when localization is required (language non-persistence is unchanged).

`Manual` SHALL forward nothing: no `--supervised`, no `--fast-track` injection, and no `--overview-lang` injection from the supervised path. Independently invoked `/sai-1-spec` and `/sai-2-design` outside Auto SHALL not receive the marker from explore.

#### Scenario: Auto spec dispatch carries the marker

- **WHEN** Auto starts a supervised run for a change whose spec phase has not yet converged or exhausted
- **THEN** `wrapper_echo_value` is empty and `arguments_value` begins with the line `--supervised` ahead of the crystallized body
- **AND** after flag stripping the worker still receives the complete crystallized `Ready to Propose` block as the verbatim request

#### Scenario: Auto chained design dispatch carries the marker

- **WHEN** Auto chains design after a non-`failed`/`cancelled` spec ending
- **THEN** `wrapper_echo_value` is empty and `arguments_value` is of the shape `{name} --fast-track --supervised` (plus `--overview-lang {overview_language}` when selected)
- **AND** `--supervised` need not be the first token

#### Scenario: design-phase retry carries the marker

- **WHEN** a later Auto selection retries only the design phase over existing reviewed spec artifacts
- **THEN** the design dispatch includes `--supervised` exactly as the normal chained design dispatch does
- **AND** it does not reintroduce an automatic worker-owned reviewer by omitting the marker

#### Scenario: explore never uses wrapper echo as the marker carrier

- **WHEN** Auto constructs any supervised phase-worker dispatch
- **THEN** `wrapper_echo_value` is empty
- **AND** the marker is not supplied as a bare non-empty echo value that would discard the crystallized request

#### Scenario: Manual forwards no supervised marker

- **WHEN** the user selects Manual on the crystallization-close pipeline selector
- **THEN** explore dispatches no phase worker
- **AND** no `--supervised` flag is injected into any later independent invocation by that Manual selection

#### Scenario: marker is not a third envelope field

- **WHEN** any Auto dispatch envelope is constructed
- **THEN** the envelope still consists of exactly `wrapper_echo_value` and `arguments_value`
- **AND** `--supervised` appears only as flag content inside those strings

### Requirement: Preserve chained forwarding

When `sai-explore` runs selector-dispatched `Auto` supervision with `--overview-lang <language>`, it SHALL retain the value only in invocation-scoped supervised state and SHALL include the same flag and value in the chained `sai-2-design` worker request. `Manual` SHALL forward nothing. The existing chained fast-track behavior SHALL remain active. The supervised marker forwarding defined by `Forward supervised marker on Auto dispatches` SHALL compose with this requirement: a language-bearing chained design request SHALL carry `--fast-track`, `--supervised`, and `--overview-lang <language>` together; a language-absent chained design request SHALL carry `--fast-track` and `--supervised` without a language flag.

#### Scenario: Selected language reaches chained design

- **WHEN** Auto starts a supervised run with an overview-language value
- **THEN** the chained design request includes `--overview-lang spanish` alongside its existing `--fast-track` behavior and the `--supervised` marker
- **AND** the design worker generates the overview in `spanish`

#### Scenario: Unselected language preserves the existing chain

- **WHEN** Manual starts or Auto starts a supervised run without `--overview-lang`
- **THEN** the chained design request contains no language flag, retains existing chaining behavior including `--supervised` on Auto, and the design worker defaults overview generation to English

### Requirement: Do not persist language across isolated chats

The normal non-supervised explore flow SHALL not persist or inject an overview language into a later isolated `sai-2-design` invocation. Users SHALL provide the flag again when starting a separate design invocation or requesting a later localized regeneration.

#### Scenario: Normal explore transition does not carry language

- **WHEN** an explore invocation uses `--overview-lang spanish` without an `Auto` selection and the user later starts `sai-2-design` in a new isolated chat without the flag
- **THEN** the later design invocation has no Spanish language state and defaults overview generation to English

#### Scenario: No persisted language field is created

- **WHEN** a supervised or isolated explore invocation uses `--overview-lang spanish`
- **THEN** no `overview.language` or equivalent language preference is written to `.openspec.yaml` or any other change artifact

#### Scenario: Failed or cancelled design retry requires the flag again

- **WHEN** a supervised design phase fails or is cancelled and a later invocation retries the pipeline
- **THEN** the later invocation does not reuse the earlier language and must supply `--overview-lang <language>` again to request localization
