# opencode-variant-discovery Specification

## Purpose
_TBD: purpose not yet written._

## Requirements

### Requirement: Provider-scoped verbose query after model selection
The OpenCode settings selector SHALL obtain variants from a single cached `opencode api model.list` query per setup run and SHALL NOT execute a per-provider verbose query. The runner SHALL receive the executable plus the provider-free argument array, and the fetched list SHALL be reused for every selected model including across back navigation without re-querying. The command SHALL NOT pass `--refresh`. On Windows, the default runner MUST invoke `powershell.exe` and pass the provider-free argument array as JSON environment data for decoded PowerShell splatting; on non-Windows platforms, direct argument-vector execution SHALL remain unchanged.
#### Scenario: verbose query carries the selected provider
- **WHEN** the user selects model `deepseek-v4-flash` under provider `opencode-go`
- **THEN** the selector SHALL execute `opencode api model.list` with a provider-free vector and filter the cached list by that provider and model
#### Scenario: verbose query passes the provider as an argument-array element
- **WHEN** the selector executes the cached model-list query
- **THEN** the runner SHALL receive the executable plus the argument array `api model.list` with no provider value interpolated into shell syntax
#### Scenario: verbose query never passes the refresh flag
- **WHEN** the selector executes the cached model-list query
- **THEN** the executed command line SHALL contain no `--refresh` flag
#### Scenario: Windows verbose discovery preserves the provider argument
- **WHEN** variant discovery runs on Windows
- **THEN** the runner SHALL resolve the OpenCode npm shim through PowerShell and pass the provider-free model-list vector as decoded argument data with no provider text interpolated
#### Scenario: Non-Windows verbose discovery keeps direct execution
- **WHEN** variant discovery runs on a non-Windows platform
- **THEN** the runner SHALL invoke `opencode` directly with the provider-free model-list vector

### Requirement: Multiline model-record parsing
The selector SHALL parse the v2 list stdout with BOM-tolerant JSON parsing and SHALL read the model list from the `.data` array with fallback to a plain array payload. The parser SHALL strip NUL bytes and a leading BOM before parsing, SHALL treat empty output or output without a data array as a parsing failure, and SHALL treat unparseable output as a parsing failure that degrades to model-only.

#### Scenario: header plus multiline JSON parses into one record
- **WHEN** the v2 list stdout contains a `.data` array with an entry for `opencode-go/deepseek-v4-flash` carrying ordered variant ids
- **THEN** the parser SHALL return the data array with that entry intact and variant order preserved

#### Scenario: multiple records separated by blank lines parse independently
- **WHEN** the v2 list `.data` array contains two model entries for the same provider
- **THEN** each entry SHALL remain distinct with its own variant set and the two entries SHALL NOT be merged

#### Scenario: header without a parseable JSON object is a failure
- **WHEN** the v2 list stdout is empty, unparseable, or lacks a data array
- **THEN** the parser SHALL report a parsing failure that degrades to model-only without a variant screen

#### Scenario: a record parsing to a primitive, null, or array is a failure
- **WHEN** the v2 list stdout parses to a value without a usable data array such as a bare object without data, an empty string, or a primitive
- **THEN** the parser SHALL report a parsing failure that degrades to model-only without a variant screen

### Requirement: Selected-model matching by full identity
The selector SHALL match the selected model against the parsed list by exact `providerID` and `id` equality. Entries whose provider or model identifier does not match exactly SHALL be ignored, and a selected model absent from the list SHALL degrade to model-only without a variant screen.

#### Scenario: exact header match selects the model's record
- **WHEN** the selected model is `opencode-go/deepseek-v4-flash` and the parsed list contains that providerID and id pair
- **THEN** that entry SHALL supply the variant discovery result and non-matching entries SHALL be ignored

#### Scenario: missing matching record fails variant discovery
- **WHEN** the selected model appears in no parsed list entry
- **THEN** the selector SHALL degrade to model-only settings with no variant screen and no placeholder variant substituted

### Requirement: Variant extraction from the matched record
The selector SHALL extract the selected model variants from the matched entry `variants` array in original order using each element `id` value. An absent, null, non-array, or empty `variants` value SHALL expose no variants and SHALL skip the variant screen without cancelling the run.

#### Scenario: variant keys become the variant list
- **WHEN** the matched entry carries variant ids `low`, `high`, and `max` in that order
- **THEN** the selector SHALL expose exactly `low`, `high`, and `max` in that order

#### Scenario: empty or absent variants field exposes no variants
- **WHEN** the matched entry carries an empty or absent `variants` field
- **THEN** the selector SHALL treat the model as exposing no variants and skip the variant screen

#### Scenario: an array, null, or primitive variants value fails variant discovery
- **WHEN** the matched entry carries a null, non-array, or otherwise unusable `variants` value
- **THEN** the selector SHALL expose no variants, derive no names from the invalid value, and degrade to model-only without a variant screen

### Requirement: Variant discovery failure is non-fatal cancellation
When the model-list query launch throws, the query exits non-zero, its stdout cannot be parsed, no parsed entry matches the selected model, or the matched entry exposes no variants, the OpenCode customization SHALL degrade to model-only settings with no variant screen presented and no placeholder variant offered. The degraded path SHALL emit an actionable diagnostic identifying the failed model-list query, preserving stderr when available or reporting the exit status when stderr is empty. The customization run SHALL complete normally without hard-exiting the process.
#### Scenario: verbose query failure cancels without an override
- **WHEN** the model-list query exits non-zero or its output cannot be parsed
- **THEN** the selector SHALL degrade to model-only settings with no variant screen presented
#### Scenario: unmatched model cancels without a placeholder variant
- **WHEN** no parsed entry matches the selected model
- **THEN** the selector SHALL degrade to model-only settings with no placeholder or default variant substituted
#### Scenario: invalid variants value cancels without derived names
- **WHEN** the matched entry carries an absent, empty, or unusable `variants` value
- **THEN** the selector SHALL expose no variants and degrade to model-only with no names derived from the invalid value
#### Scenario: Verbose launch failure reports the cause
- **WHEN** the model-list command runner throws while querying model variants
- **THEN** the selector SHALL log an `Unable to query OpenCode model variants` diagnostic containing the launch error and degrade to model-only settings
#### Scenario: Verbose non-zero exit reports stderr or status
- **WHEN** the model-list command exits with a non-zero status
- **THEN** the selector SHALL log the command failure detail and degrade to model-only without showing a variant screen
