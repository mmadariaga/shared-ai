# overview-language-flag Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Parse the overview language flag

The shared `sai-explore` and `sai-2-design` flows SHALL recognize the optional `--overview-lang <language>` flag. The flag SHALL consume one non-empty CLI value, SHALL accept free-form language names without a maintained registry, and SHALL default the effective language to English when absent. A duplicate occurrence SHALL produce a clear validation error. A change-consuming `sai-2-design` invocation SHALL place its change name before this flag and SHALL report a clear validation error if parsing leaves no change name.

#### Scenario: Default language when the flag is absent

- **WHEN** a valid `sai-explore` or `sai-2-design` invocation contains no `--overview-lang` flag
- **THEN** the effective overview language is English and existing argument behavior is preserved

#### Scenario: Selected language is extracted

- **WHEN** a valid invocation contains `--overview-lang spanish`
- **THEN** the effective overview language is `spanish` and the flag plus its value are removed from the arguments used for subsequent resolution

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

### Requirement: Preserve remaining argument semantics

The flag parser SHALL remove only `--overview-lang` and its value before change-name resolution, SHALL preserve the change name and all unrelated arguments, and SHALL recognize `--fast-track` regardless of whether it appears before or after the language flag.

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
