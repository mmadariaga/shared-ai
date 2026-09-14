# explore-codegraph-fallback-notice Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.
## Requirements
### Requirement: One-time research-tooling check at explore session start

`sai-explore` SHALL perform a research-tooling availability check exactly once per explore session, at the start of the session, before any code search (grep/glob/Read) is performed for the user's request. The check SHALL run via `sai/tools/research-tools-check.js` invoked from `sai/commands/explore/body.md` immediately after the prereqs `verdict: pass` and before Load behaviors and the first research, once per session with no reprint on later turns, and SHALL NOT run when prereqs halt or cannot be completed. The check SHALL apply only within `sai-explore`; no other `sai-*` command's behavior SHALL change. The check SHALL be non-blocking — it SHALL NOT halt the session, prompt the user, or gate any subsequent work on its outcome.

#### Scenario: check fires once before any code search

- **WHEN** a `sai-explore` session begins
- **THEN** the agent evaluates the research-tooling state and prints the corresponding notice before performing any grep/glob/Read for the user's request

#### Scenario: check does not fire again later in the same session

- **WHEN** the same `sai-explore` session continues with further turns after the initial notice
- **THEN** the agent does not repeat the research-tooling check or reprint the notice

#### Scenario: check never blocks the session

- **WHEN** the research-tooling check runs
- **THEN** the session proceeds normally regardless of the detected state, with no prompt and no halt

#### Scenario: other sai commands are unaffected

- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no research-tooling notice is printed

#### Scenario: check runs after prereqs pass and before first research

- **WHEN** prereqs pass in a `sai-explore` session
- **THEN** the agent runs the script probe once before Load behaviors and first research and prints its literal without halting

### Requirement: Read-only detection via tool presence and Glob

The check SHALL determine the research-tooling state using only read-only signals: the `sai/tools/research-tools-check.js` filesystem probe (project-root `.codegraph/` readdir counting only entries other than `.gitignore`, plus `codegraph --version` binary presence) combined with caller-supplied explicit `--mcp-present true|false` derived from inspecting the session tool list for `codegraph_*` or `mcp__codegraph__*` including deferred tools. Code-graph MCP tools SHALL be recognized whether exposed unprefixed (`codegraph_*`) or harness-namespaced (`mcp__codegraph__*`); detection SHALL NOT depend on a single literal prefix. The script SHALL never infer MCP itself; when the flag is omitted MCP is removed from detection and the binary alone decides. The root-scoped results SHALL count as index evidence only when they include an entry other than `.gitignore`; a nested `.codegraph/` in some other directory does not by itself decide the state. The check SHALL NOT use any write or edit tool and SHALL NOT create or modify any file, consistent with explore mode being strictly read-only.

#### Scenario: detection uses only read-only probes

- **WHEN** the agent evaluates the research-tooling state
- **THEN** it inspects code-graph MCP tool presence and runs only a read-only directory-scoped `Glob` with `path: .codegraph` and `pattern: *` at the project root, and performs no file writes or edits

#### Scenario: harness-namespaced tool names are recognized

- **WHEN** the code-graph MCP tools are exposed under a harness namespace such as `mcp__codegraph__*` rather than an unprefixed `codegraph_*`
- **THEN** the agent still recognizes the code-graph MCP as present and does not fall through to the "not installed" state

#### Scenario: a root entry other than the sentinel is evidence

- **WHEN** the root-scoped `.codegraph` results include an entry such as `codegraph.db`
- **THEN** the check treats the project-root index as present

#### Scenario: a sentinel-only directory is not evidence

- **WHEN** the root-scoped results contain only `.gitignore`
- **THEN** the check treats the project-root index as absent

#### Scenario: a nested-only directory is not evidence

- **WHEN** a `.codegraph` directory exists only below another project directory and the root-scoped results contain no non-sentinel entry
- **THEN** the nested directory does not determine the research-tooling state

#### Scenario: binary probe and explicit MCP flag decide installed state

- **WHEN** the script evaluates binary presence and the caller supplies explicit MCP presence
- **THEN** installed state reflects the binary answer or explicit MCP presence with no script-side MCP inference

### Requirement: Three-state detection with matching notice

The check SHALL classify the research-tooling state as one of exactly three script statuses (`not-installed`, `no-index`, `ready`) mapping to the three observable states and print the matching verbatim English literal returned by the script:

- **not installed** — no code-graph install evidence is present. The notice SHALL state that structural research will fall back to grep/glob/Read and SHALL recommend installing CodeGraph, naming its URL (https://github.com/colbymchenry/codegraph).
- **installed but no index** — install evidence is present but the project-root index probe returns no entry other than `.gitignore`. The notice SHALL state the fallback and SHALL recommend running `codegraph init -i`.
- **ready** — install evidence is present and the project-root index probe returns at least one entry other than `.gitignore`. The notice SHALL briefly state that structural research will use codegraph.

#### Scenario: no code-graph tools present

- **WHEN** the session has no code-graph MCP tools available
- **THEN** the agent prints a fallback notice recommending installation of CodeGraph and naming its URL

#### Scenario: code-graph tools present but no index

- **WHEN** code-graph MCP tools are present but the root-scoped directory `Glob` returns no entry other than `.gitignore`
- **THEN** the agent prints a fallback notice recommending `codegraph init -i`

#### Scenario: code-graph tools and index both present

- **WHEN** code-graph MCP tools are present and the root-scoped directory `Glob` returns an entry other than `.gitignore`
- **THEN** the agent prints a brief notice that structural research will use codegraph

### Requirement: Notice is always English

The notice text SHALL always be the script-returned verbatim English `literal` relayed unchanged by the caller, regardless of the dominant natural language of the conversation. This English-only rule applies to this notice only and SHALL NOT change the `sai/policies/remember.md` language policy for any other output.

#### Scenario: non-English session still gets an English notice

- **WHEN** the `sai-explore` session's conversation language is not English
- **THEN** the research-tooling notice is still printed in English while other chat output continues to follow the `remember.md` language policy

### Requirement: Notice is visually emphasized
The notice SHALL be rendered so that it visually stands out in scrollback rather than as an unmarked plain-text line. It SHALL use markdown emphasis — at minimum a bold lead. Fallback notices for the not-installed and no-index states SHALL present as a blockquote callout carrying a warning marker. The `ready` notice SHALL present as a blockquote callout with a bold lead and without a warning marker. Text output and the `literal` field in `--json` mode share the same `LITERALS.ready` value.

#### Scenario: fallback notice is emphasized
- **WHEN** the check prints a fallback notice for the not-installed or installed-but-no-index state
- **THEN** the notice is visually emphasized (a bold lead, and a blockquote callout with a ⚠️ marker) rather than an unmarked plain-text line

#### Scenario: ready notice is emphasized
- **WHEN** the check prints the ready-state notice
- **THEN** the notice is visually emphasized as a blockquote callout with a bold lead and without a warning marker so it stands out in scrollback without presenting as a warning

#### Scenario: ready JSON literal carries no warning marker
- **WHEN** the check emits the ready state with `--json`
- **THEN** the `literal` field renders as blockquote and bold without a warning marker

### Requirement: Generic preference with CodeGraph-specific recommendation

The notice MAY express a generic preference for any available code-graph MCP for structural research. The actionable install and init recommendations SHALL name CodeGraph specifically and reference https://github.com/colbymchenry/codegraph. The check SHALL NOT restate or rewrite the "prefer codegraph over grep" guidance that a code-graph MCP already injects into the harness's global memory; its added value is the fallback and recommendation path only.

#### Scenario: recommendation names CodeGraph

- **WHEN** the notice recommends installing or initializing a code-graph tool
- **THEN** the recommendation names CodeGraph and references https://github.com/colbymchenry/codegraph

#### Scenario: check does not duplicate global prefer-codegraph guidance

- **WHEN** a code-graph MCP is present and already injects prefer-codegraph-over-grep guidance into the harness's global memory
- **THEN** the check does not restate or rewrite that guidance and limits its output to the state notice

