## MODIFIED Requirements

### Requirement: Forward only the supervised Auto language

The supervised chain SHALL forward a non-`None` language only from explicit `--overview-lang` input or gate 9 resolved by displayed `Auto (sai-1 + sai-2)`. Manual SHALL forward nothing, and Auto (fast implementation) SHALL not generate an overview.

#### Scenario: Language forwarding follows route selection

- **WHEN** displayed supervised Auto selects or receives a non-`None` language
- **THEN** the chained design envelope includes `--fast-track --supervised --overview-lang <language>` and other routes receive no overview dispatch

### Requirement: Preserve no-language retry behavior

When the language resolves to `None`, the chained design envelope SHALL omit `--overview-lang` while retaining its existing supervised and fast-track markers.

#### Scenario: None remains omitted from the design envelope

- **WHEN** supervised Auto resolves the overview decision to `None`
- **THEN** the design envelope contains `--fast-track --supervised` without an overview-language option
