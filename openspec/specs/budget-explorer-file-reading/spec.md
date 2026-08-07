# budget-explorer-file-reading Specification

## Purpose
Governs how the budget-explorer agent reads file contents, including tool bindings and bounded-read guardrails that protect against unbounded reads of transcripts and append-only streams.

## Requirements

### Requirement: The budget-explorer agent SHALL use `read/readFile` for reading file contents

The tool binding for file reading was updated from `read/fileContents` to `read/readFile` to match the Copilot tool registry.

#### Scenario: File content reading
- **WHEN** the budget-explorer agent needs to read the contents of a file
- **THEN** it SHALL invoke the `read/readFile` tool

### Requirement: The budget-explorer SHALL apply bounded-read guardrails before any file Read

The budget-explorer agent SHALL apply the following bounded-read guardrails before invoking any Read on a file path:

- The budget-explorer SHALL NOT Read any agent transcript file (paths matching `**/transcript*` or the harness-documented transcript path).
- The budget-explorer SHALL NOT Read any `.output` or `.jsonl` file (paths matching `**/*.output` or `**/*.jsonl`) without an explicit per-call cap.
- The budget-explorer SHALL NOT Read any file that the file-type detector reports as binary.
- When the goal of the read is a known symbol, value, or short excerpt, the budget-explorer SHALL prefer a bounded Grep with `head_limit` over a whole-file Read.

The rationale is that an unbounded Read on a transcript or append-only stream is a known risk vector for blocking the budget-explorer's turn; these guardrails are risk-reduction hygiene pending diagnosis of the actual hang trigger observed in this session. The three banned classes (agent transcripts, JSONL/.output files, binary files) are plausible candidates but the actual trigger has not been identified by this change. The guardrails are framed as hygiene, not as a demonstrated causal remedy.

#### Scenario: Agent transcript path is rejected before Read

- **WHEN** the budget-explorer identifies a candidate file path that matches `**/transcript*` or the harness-documented transcript path
- **THEN** the budget-explorer SHALL NOT invoke Read on that path
- **AND** SHALL switch to a targeted Grep with `head_limit`, or escalate to the main agent for a `Read` with a budget

#### Scenario: JSONL or .output file is rejected before Read

- **WHEN** the budget-explorer identifies a candidate file path that matches `**/*.output` or `**/*.jsonl`
- **THEN** the budget-explorer SHALL NOT invoke Read on that path without an explicit per-call cap
- **AND** SHALL default to a bounded Grep with `head_limit` instead

#### Scenario: Binary file is rejected before Read

- **WHEN** the budget-explorer identifies a candidate file path and the file-type detector reports the file as binary
- **THEN** the budget-explorer SHALL NOT invoke Read on that path
- **AND** SHALL fall back to a metadata-only inspection or escalate to the main agent

#### Scenario: Bounded Grep is preferred over whole-file Read for known-symbol lookups

- **WHEN** the budget-explorer's task is to find a specific symbol, identifier, value, or short string in a file
- **THEN** the budget-explorer SHALL use a Grep with `head_limit` bounded to a small constant (default 30 lines, justified on output-size grounds — roughly a screen of terminal output that a caller can usefully scan in one result without overwhelming context; the value is not anchored to any existing cap and may be lowered for known-symbol lookups or raised when the bounded Grep does not return the target) before considering a whole-file Read
- **AND** SHALL only escalate to a whole-file Read when the bounded Grep does not return the target
