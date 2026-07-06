# explorer-claude Specification

## Purpose
TBD - created by archiving change sai-explorer-harness-context. Update Purpose after archive.
## Requirements
### Requirement: harness-file-location
`~/.claude/sai/instructions/explorer.claude.md` SHALL exist as a standalone instruction file for the Claude Code harness.

#### Scenario: file resolvable via fetch
- **WHEN** a sai skill command executes `Fetch @~/.claude/sai/instructions/explorer.claude.md`
- **THEN** the file is found and its contents are loaded into the active instruction context

### Requirement: subagent-type-binding
The file SHALL declare that "cheap research subagent" maps to subagent_type `Explore` (capital E) when spawned via the Agent tool in Claude Code.

#### Scenario: lookup task delegation
- **WHEN** a sai skill needs to perform a lookup task (find a known fact, file path, or symbol)
- **THEN** the agent MUST spawn an `Explore` subagent with an explicit `model` parameter and an output contract

#### Scenario: model never omitted
- **WHEN** any Explore subagent is spawned
- **THEN** the `model` parameter MUST be specified; omitting it is prohibited to prevent silent Opus inheritance

### Requirement: model-tier-rules
The file SHALL define two model tiers for subagent spawns:
- Lookup tasks: `model: haiku`
- Multi-step research requiring cross-file reasoning beyond haiku capability: `model: sonnet`

Frontier-tier (opus) is reserved for the main agent only and MUST NOT appear in subagent spawns.

#### Scenario: haiku for lookup
- **WHEN** delegating a single-target lookup (version number, file path, symbol definition)
- **THEN** the Explore subagent MUST use model haiku

#### Scenario: sonnet for complex research
- **WHEN** delegating multi-step research requiring synthesis or cross-file reasoning
- **THEN** the Explore subagent MUST use model sonnet, not haiku or opus

### Requirement: task-classification
The file SHALL define three task classifications used by cost-discipline rules:
- `lookup`: find a known fact (version, file path, symbol); strict delegation rules apply
- `synthesis`: design, trade-off reasoning, architecture proposals; reserved for main agent, not delegated to subagents
- `audit`: drift detection, doc-vs-code divergence, dead-link scans; audit-mode relaxations apply

#### Scenario: synthesis stays in main
- **WHEN** the task requires design decisions or trade-off reasoning
- **THEN** the main agent performs synthesis directly; no subagent is spawned for this purpose

#### Scenario: audit mode activates relaxations
- **WHEN** the task is classified as audit
- **THEN** the main agent MAY read target artifacts directly (up to the declared cap) and subagent prompts MUST require verbatim excerpts (file:line + literal strings) for every reported divergence

### Requirement: tool-call-caps
The file SHALL declare per-spawn tool-call caps for Explore subagents:
- Lookup subagent: ≤10 tool calls per spawn
- Audit subagent: ≤30 tool calls per spawn

If a task exceeds the cap, spawn an additional subagent rather than raising the cap.

#### Scenario: cap declared in prompt
- **WHEN** a lookup Explore subagent is spawned
- **THEN** its prompt explicitly bounds the work (e.g. "report only Y, ≤10 tool calls") and the model is haiku

### Requirement: output-contract-required
Every subagent spawn MUST declare an output contract in the prompt: exact fields expected in the response, a hard length cap, and an explicit prohibition on raw file contents (unless the verbatim string is the direct answer).

#### Scenario: output contract present
- **WHEN** any Explore subagent is spawned from a sai skill
- **THEN** the prompt includes: fields expected in the response, max word or line count, and a "no raw file contents" constraint (or "verbatim excerpts required" for audit mode)

