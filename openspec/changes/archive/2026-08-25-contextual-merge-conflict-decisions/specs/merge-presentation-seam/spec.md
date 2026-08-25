# merge-presentation-seam Specification

## MODIFIED Requirements

### Requirement: Contextual decision presentation boundary

The merge presentation seam MUST render semantic conflicts as informed decisions over complete behavioral outcomes. The source MUST identify the file and conflict region, separate Facts from Inferences, explain branch objectives and trade-offs, identify affected contracts, and state the synthesis safety assessment. Human-facing labels MUST describe behavior rather than expose bare `ours` or `theirs` jargon.

#### Scenario: Contextual alternatives are rendered faithfully

- **WHEN** the worker returns a semantic decision result
- **THEN** the seam presents the worker-authored ordered options and adjacent contextual summary without changing option values or continuation semantics

### Requirement: Pending contextual decisions block mutation

The seam and coordinator MUST NOT write, remove conflict markers, stage, or authorize a commit while a contextual decision or `more-context` continuation is pending.

#### Scenario: More context remains mutation-free

- **WHEN** the user selects `more-context`
- **THEN** the seam forwards the exact value to the same worker and performs no resolution write, staging, or commit

### Requirement: Complete-file validation precedes coordinator mutation

The coordinator MUST validate the complete resolution payload atomically before entering the resolution boundary and MUST write each validated complete file content exactly as supplied.

#### Scenario: Valid complete payload enables writes

- **WHEN** every required decision is explicit and every file record passes path, category, decision, content, and marker validation
- **THEN** the coordinator writes and stages only the validated complete file contents
