# opencode-variant-discovery Specification

## Purpose
_TBD: purpose not yet written._

## Requirements

### Requirement: Provider-scoped verbose query after model selection
After the user selects a model on the model screen, the OpenCode settings selector SHALL execute `opencode models <provider> --verbose` through the injectable command runner, where `<provider>` is the selected model's provider identifier, in order to obtain that provider's model records. The provider identifier is used as-is from the parsed catalog; the runner SHALL receive the executable plus an argument array, with the provider passed as an element of that array and never shell-string-interpolated. The command SHALL NOT pass `--refresh`.

#### Scenario: verbose query carries the selected provider
- **WHEN** the user selects model `deepseek-v4-flash` under provider `opencode-go`
- **THEN** the selector executes the command line `opencode models opencode-go --verbose`

#### Scenario: verbose query passes the provider as an argument-array element
- **WHEN** the selector executes the provider-scoped verbose query
- **THEN** the provider identifier is passed as an element of the argument array (`opencode`, `['models', '<provider>', '--verbose']`) and is never interpolated into a shell string

#### Scenario: verbose query never passes the refresh flag
- **WHEN** the selector executes the provider-scoped verbose query
- **THEN** the executed command line contains no `--refresh` flag

### Requirement: Multiline model-record parsing
The selector SHALL parse the verbose command's stdout as a sequence of model records. Each record SHALL consist of a header line carrying the model's full `provider/model-id` identity followed by a pretty-printed multiline JSON object. The parser SHALL accumulate lines after a header until the accumulated text parses as JSON, then attach that parsed object to the header's model identity, and continue with the next header. Blank lines between records SHALL be skipped. The parser SHALL treat a header with no parseable JSON object as a parsing failure, and SHALL also treat a record whose accumulated text parses to a JSON value that is not a non-null, non-array object — a string, number, boolean, `null`, or array — as a parsing failure.

#### Scenario: header plus multiline JSON parses into one record
- **WHEN** the verbose output contains a header line `opencode-go/deepseek-v4-flash` followed by a multi-line pretty-printed JSON object ending in `}`
- **THEN** the parser attaches the accumulated JSON object to the identity `opencode-go/deepseek-v4-flash` and no other record

#### Scenario: multiple records separated by blank lines parse independently
- **WHEN** the verbose output contains two header-plus-JSON records separated by one blank line
- **THEN** each header receives exactly its own accumulated JSON object and the two records are not merged

#### Scenario: header without a parseable JSON object is a failure
- **WHEN** a header line is followed by lines that never accumulate into parseable JSON
- **THEN** the parser reports a parsing failure for that record

#### Scenario: a record parsing to a primitive, null, or array is a failure
- **WHEN** a header is followed by text that parses to `42`, `null`, `"str"`, or `[1, 2]`
- **THEN** the parser reports a parsing failure for that record

### Requirement: Selected-model matching by full identity
The selector SHALL match the selected model against the parsed records by full identity: the header line `provider/model-id` MUST equal the selected model's provider and model identifiers exactly. Records whose header does not match the selected model SHALL be ignored. When no parsed record matches the selected model, the selector SHALL treat variant discovery as failed.

#### Scenario: exact header match selects the model's record
- **WHEN** the selected model is `opencode-go/deepseek-v4-flash` and the parsed records include a header with exactly that identity
- **THEN** that record is used for variant extraction and non-matching records are ignored

#### Scenario: missing matching record fails variant discovery
- **WHEN** the selected model's full identity appears in no parsed record header
- **THEN** the selector treats variant discovery as failed

### Requirement: Variant extraction from the matched record
The selector SHALL extract the selected model's variants from the matched record's `variants` field. The variant set SHALL be the keys of the `variants` object in JSON object order. A record whose `variants` field is absent or an empty object SHALL be treated as exposing no variants. A record whose `variants` field is present but is not a non-null, non-array object — a string, number, boolean, `null`, or array — SHALL be treated as a variant-discovery failure: no variant names are derived from such a value (in particular, array indices SHALL NOT become variant names), and the run cancels.

#### Scenario: variant keys become the variant list
- **WHEN** the matched record's `variants` object is `{ "low": { ... }, "high": { ... }, "max": { ... } }`
- **THEN** the selector exposes exactly the variants `low`, `high`, and `max` in that JSON order

#### Scenario: empty or absent variants field exposes no variants
- **WHEN** the matched record's `variants` field is `{}` or absent
- **THEN** the selector treats the model as exposing no variants

#### Scenario: an array, null, or primitive variants value fails variant discovery
- **WHEN** the matched record's `variants` field is an array, `null`, or a primitive string, number, or boolean
- **THEN** variant discovery fails with no variant names derived, array indices are never exposed as variant names, and the run cancels

### Requirement: Variant discovery failure is non-fatal cancellation
When the verbose query exits non-zero, its stdout cannot be parsed, no parsed record matches the selected model, or the matched record's `variants` value is present but not a non-null, non-array object, the OpenCode customization SHALL cancel: no variant screen SHALL be presented, no placeholder variant SHALL be offered, and no settings SHALL be produced (hence no override). The customization run SHALL complete normally without hard-exiting the process.

#### Scenario: verbose query failure cancels without an override
- **WHEN** the verbose query exits non-zero or its output cannot be parsed
- **THEN** OpenCode customization is cancelled with no variant screen presented and no settings produced

#### Scenario: unmatched model cancels without a placeholder variant
- **WHEN** no parsed record matches the selected model
- **THEN** OpenCode customization is cancelled and no placeholder or default variant is substituted

#### Scenario: invalid variants value cancels without derived names
- **WHEN** the matched record's `variants` value is present but is an array, `null`, or a primitive
- **THEN** OpenCode customization is cancelled and no variant names are derived from the invalid value
