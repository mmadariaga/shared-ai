## MODIFIED Requirements

### Requirement: Parse the overview language flag
The shared `sai-explore` and `sai-2-design` flows SHALL recognize the optional `--overview-lang <language>` flag. The flag SHALL consume one non-empty CLI value, SHALL accept free-form language names without a maintained registry, and SHALL provide a direct language selection and overview-generation opt-in when present. When the flag is absent, the parser SHALL leave the overview-language decision unresolved rather than synthesizing an English value; `sai-explore` gate 9 may then resolve that decision during crystallization. A duplicate occurrence SHALL produce a clear validation error. A change-consuming `sai-2-design` invocation SHALL place its change name before this flag and SHALL report a clear validation error if parsing leaves no change name.

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

## REMOVED Requirements

### Requirement: Default language when the flag is absent
**Reason:** The absent-flag English default contradicts the implemented opt-in overview-language contract.
**Migration:** Use the no-generation route unless the current invocation supplies an explicit language or an Explore gate forwards one.

#### Scenario: absent-flag-default-is-retired
- **WHEN** a supported flow omits `--overview-lang`
- **THEN** it does not resolve English as the effective language.

