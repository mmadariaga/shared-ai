# pre-write-backfill-validation Specification

## Purpose
Validate complete backfill draft sets against current project inputs before repository writes, while retaining diagnostics and enforcing input freshness.

## Requirements

### Requirement: Shared receiver-side validation of complete backfill draft sets
Standalone backfill and Direct Build receivers in Claude Code and opencode SHALL use one shared validate-backfill-drafts.js tool after schema and preservation checks to validate the entire latest reference set before writes or execute authorization. The tool SHALL require canonical metadata, proposal, and at least one capability spec, verify every transfer reference, and reject duplicate or non-allow-listed destinations. It SHALL create a private temporary project outside the repository through temp-root.js and copy all current specifications with their relative paths, applicable configuration, schemas, and exact verified draft bytes. Existing unreadable, symbolic, unsafe, or nonregular inputs SHALL fail rather than be treated as absent. It SHALL run openspec validate <name> --type change --json --no-interactive in that project without initializing or registering a store or modifying source project files.

#### Scenario: Both entry points validate before writing
- **WHEN** standalone backfill or Direct Build has a complete schema-valid and preservation-valid draft set
- **THEN** its receiver runs the shared CLI validator on the complete set before any materialization or execute authorization

#### Scenario: Untouched specifications remain validation inputs
- **WHEN** a capability is absent from the draft set but exists in the project
- **THEN** its specification is copied at its relative path into the temporary project and participates in input freshness

#### Scenario: An input cannot be safely copied
- **WHEN** a present specification or other validation input is unreadable, symbolic, or invalid as a file or directory
- **THEN** validation fails with diagnostics and leaves repository files unchanged

### Requirement: Failed or incomplete validation grants no write authority
The validator SHALL accept only a successful CLI exit with complete JSON evidence naming the expected change as valid in the expected temporary project and unchanged collected inputs. CLI rejection, an unavailable CLI, timeout, incomplete output, copy failure, or changed inputs SHALL return failure with retained diagnostics and authorize no repository writes. Receivers SHALL return diagnostics for correction under their existing obstacle budgets and repeat all checks on the complete corrected set; review-cap exhaustion SHALL NOT bypass validation. Successful evidence SHALL include fingerprint, project_dir, and CLI diagnostics. Validation evidence SHALL remain outside repository artifacts and remain available while correction or recovery needs it; accepted cleanup SHALL use temp-root.js removal with the active harness.

#### Scenario: CLI rejects scenario loss
- **WHEN** a MODIFIED requirement removes or renames an existing scenario
- **THEN** CLI validation fails and the original project remains unchanged

#### Scenario: Intentional replacement uses a distinct name
- **WHEN** a delta removes an old requirement and adds its replacement
- **THEN** the original name cannot be reused or collide with an existing name; a valid distinct explicitly chosen replacement can pass validation without bypassing archive controls

#### Scenario: Missing CLI or incomplete result
- **WHEN** the CLI cannot run or exits zero without complete expected validation evidence
- **THEN** validation fails and retains the diagnostic without materializing drafts

### Requirement: Accepted validation is bound to current inputs
A successful fingerprint SHALL bind the project identity, change name, exact complete reference set, draft bytes, all current specifications, configuration, and schemas. Receivers SHALL run the shared freshness check with that fingerprint and the same complete reference set immediately before the first write or each Direct Build execute or correction authorization. Direct Build orders SHALL carry the accepted fingerprint as evidence rather than a draft reference, and the worker SHALL repeat checking before its first write. A missing fingerprint, changed input, mismatched reference set, or incomplete freshness check SHALL write nothing and require repeated receiver validation. Temporary validation SHALL NOT replace independent archive checks, spec/design CLI validation, or archive CLI controls.

#### Scenario: Inputs remain unchanged
- **WHEN** the exact validated draft set and project inputs are unchanged immediately before writing
- **THEN** freshness checking accepts the retained fingerprint and ordinary reference and authorization checks still apply

#### Scenario: Inputs change after acceptance
- **WHEN** drafts, references, current specifications, configuration, or schemas change after successful validation
- **THEN** freshness checking rejects the old fingerprint without writes and the receiver repeats validation

#### Scenario: Worker lacks accepted evidence
- **WHEN** a Direct Build execute or correction order lacks fresh accepted fingerprint evidence
- **THEN** the worker writes nothing and returns the diagnostic for repeated receiver validation
