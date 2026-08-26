# Capability: caller-prompt-discipline

## ADDED Requirements

### Requirement: Caller spawn prompts enforce goal and output-contract discipline

Every caller spawn prompt for the `budget-explorer` skill SHALL declare the exact **goal** and **output contract** (exact response fields, length cap, raw-content rule). A spawn prompt SHALL NOT prescribe a specific research tool, a numbered procedure, sequential steps, or a method.

#### Scenario: Well-formed goal and output contract
- **WHEN** a caller prompt states "Goal: [what to find]" and "Output contract: [exact fields, cap, no raw contents]"
- **THEN** the dispatch is compliant and the explorer proceeds according to the tool-preference ladder

#### Scenario: Caller prescribes a numbered procedure
- **WHEN** a caller prompt contains steps like "1. Glob all files matching..., 2. Read each one, 3. Return..."
- **THEN** the prompt violates discipline and is caught by test enforcement

#### Scenario: Caller names a specific tool in the spawn prompt
- **WHEN** a caller prompt says "use Glob to...", "run Grep on...", or "call Codegraph to..."
- **THEN** the prompt violates discipline; the ladder still governs (is not overridden), and discard logging records the violation if that tool was skipped

#### Scenario: Ladder precedence blocks tool prescription
- **WHEN** a caller prompt prescribes `Glob` but level 1 (codegraph) succeeded before level 3 (disk tools) is reached
- **THEN** the ladder governs the actual tool choice (codegraph is used, not Glob), and the discard log includes `reason: "caller prescribed Glob"` if Glob was skipped

#### Scenario: Caller prompt violation does not abort the task
- **WHEN** a caller prompt prescribes a tool despite the ladder policy
- **THEN** the task continues without abortion; the ladder governs tool selection; the discard log records the violation

#### Scenario: Test sweep detects prompt discipline violations in sai/ files
- **WHEN** an SAI instruction file contains an explorer spawn prompt with numbered steps or tool prescriptions
- **THEN** test `explorer-prompt-discipline.test.js` detects and fails on the violation
