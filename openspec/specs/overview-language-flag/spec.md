# overview-language-flag Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*
## Requirements
### Requirement: Resolve omitted overview language at the consuming route

The shared `sai-explore` and `sai-2-design` flows SHALL recognize the optional `--overview-lang <language>` flag. The flag SHALL consume one non-empty CLI value, SHALL accept free-form language names without a maintained registry, and SHALL provide a direct language selection and overview-generation opt-in when present. When the flag is absent, the parser SHALL leave the overview-language decision unresolved rather than synthesizing an English value; `sai-explore` gate 9 may then resolve that decision during supervised Auto activation. An explicit value SHALL remain conversation-only for that consuming route. A duplicate occurrence SHALL produce a clear validation error. A change-consuming `sai-2-design` invocation SHALL place its change name before this flag and SHALL report a clear validation error if parsing leaves no change name.

#### Scenario: Omitted flag does not synthesize a default

- **WHEN** a valid `sai-explore` or `sai-2-design` invocation contains no `--overview-lang` flag
- **THEN** parsing preserves the existing request and argument behavior
- **AND** the parser produces no effective overview language by itself
- **AND** `sai-explore` may resolve the decision through gate 9 rather than treating omission as implicit English

#### Scenario: Selected language is extracted

- **WHEN** a valid invocation contains `--overview-lang spanish`
- **THEN** the effective overview language is `spanish`
- **AND** overview generation is opted in
- **AND** the flag plus its value are removed from the arguments used for subsequent resolution

#### Scenario: Explicit English is still opt-in

- **WHEN** a valid invocation contains `--overview-lang English`
- **THEN** the effective overview language is `English`
- **AND** overview generation is opted in rather than treated as the omitted-flag path

#### Scenario: Missing language value is rejected

- **WHEN** `--overview-lang` is the final argument or its next token is another option such as `--fast-track`
- **THEN** the flow reports a clear missing-value validation error and does not resolve a change or dispatch overview work

#### Scenario: Duplicate language flags are rejected

- **WHEN** an invocation contains more than one `--overview-lang` occurrence
- **THEN** the flow reports a clear duplicate-flag validation error before change-name resolution or overview dispatch

#### Scenario: Change name precedes the language flag

- **WHEN** a change-consuming design invocation uses `my-change --overview-lang spanish`
- **THEN** `my-change` remains the change name, `spanish` is the effective language, and the accepted form is documented for both harnesses

#### Scenario: Language flag cannot consume the change name

- **WHEN** a change-consuming design invocation uses `--overview-lang my-change` without a preceding change name
- **THEN** the flow reports a clear missing-change-name validation error instead of treating `my-change` as a valid complete invocation

#### Scenario: absent-flag-language-remains-unresolved
- **WHEN** a supported flow contains no `--overview-lang` flag
- **THEN** parsing produces no effective language and does not opt into overview generation.

### Requirement: Preserve remaining argument semantics

The flag parser SHALL remove only `--overview-lang` and its value before change-name resolution, SHALL preserve the change name and all unrelated arguments, and SHALL recognize `--fast-track` regardless of whether it appears before or after the language flag. The supported `sai-2-design` example SHALL show the change name followed by `--fast-track --overview-lang Lang`.

#### Scenario: Fast-track precedes the language flag

- **WHEN** a design invocation contains `--fast-track --overview-lang spanish` and a change name
- **THEN** fast-track remains active, `spanish` is the effective language, and change-name resolution sees the change name without the language flag or value

#### Scenario: Fast-track follows the language flag

- **WHEN** a design invocation contains `--overview-lang spanish --fast-track` and a change name
- **THEN** the same effective language, fast-track state, and change-name resolution result are produced as when the flags are reversed

### Requirement: Keep sai-1 outside the language feature

The `sai-1-spec` flow SHALL not parse, persist, or forward `--overview-lang`; its proposal and specification artifact behavior SHALL remain unchanged.

#### Scenario: Spec proposal invocation is unchanged

- **WHEN** a user runs `sai-1-spec`
- **THEN** the flow does not add overview-language state or overview-generation behavior

### Requirement: Keep parser and gate state invocation-scoped

The parser SHALL keep flag presence and the parsed language value in invocation-scoped state. The explore gate's resolved decision SHALL additionally be scoped to the current crystallized idea or slice set for the life of the chat — surviving the end of a supervised attempt, including a failed or cancelled one, so that retries and later activations over the same set reuse it — but SHALL NOT be written to any file, artifact, `.openspec.yaml` key, or configuration. No new CLI flag is introduced. The `sai-1-spec` flow SHALL remain outside this parser and generation feature.

#### Scenario: No persisted language preference is created
- **WHEN** either supported flow is invoked with `--overview-lang spanish`, or gate 9 resolves `spanish` at a supervised Auto activation
- **THEN** the value is available only within the explore chat's supervised chain
- **AND** no `overview.language`, opt-in marker, or equivalent new `.openspec.yaml` key is written

#### Scenario: Resolution survives a failed attempt without persistence
- **WHEN** a supervised attempt ends by failure after gate 9 resolved, and a later activation over the same crystallized idea occurs
- **THEN** the stored value is reused without asking again
- **AND** it still exists only in conversation state

#### Scenario: Spec proposal behavior remains unchanged
- **WHEN** a user runs `sai-1-spec`
- **THEN** the spec-proposal flow does not parse, persist, or forward `--overview-lang`
