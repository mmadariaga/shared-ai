# emit-diagnostic-hint Specification

## Purpose
TBD - created by archiving change sai-state-powershell-quoting. Update Purpose after archive.

## Requirements

### Requirement: Quote-stripped detection with stderr hint
The emit path SHALL detect the quote-stripped signature on JSON.parse failure via looksLikeQuoteStrippedJson and SHALL write a stderr hint naming the Windows PowerShell cause with the canonical section path and a capped excerpt of the received payload, while keeping the stdout payload byte-identical as INVALID_EVENT with exit 1 and no transition.

#### Scenario: Stripped emit receives diagnostic hint without acceptance
- **WHEN** commandEmit receives a quote-stripped payload that fails JSON.parse
- **THEN** the store keeps INVALID_EVENT with exit 1 and adds the stderr hint with no transition

### Requirement: Hint silence on unrelated and valid paths
The emit path SHALL NOT write the hint for failures without the quote-stripped signature and SHALL NOT write the hint on the success path, which stays byte-identical and hint-free.

#### Scenario: Malformed or valid emit stays hint-free per path contract
- **WHEN** commandEmit receives truly malformed input without the signature or valid JSON input
- **THEN** no stderr hint is written and each path keeps its contract of bare INVALID_EVENT or normal handling
