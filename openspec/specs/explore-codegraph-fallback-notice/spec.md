## ADDED Requirements

### Requirement: One-time research-tooling check at explore session start

`sai-explore` SHALL perform a research-tooling availability check exactly once per explore session, at the start of the session, before any code search (grep/glob/Read) is performed for the user's request. The check SHALL apply only within `sai-explore`; no other `sai-*` command's behavior SHALL change. The check SHALL be non-blocking — it SHALL NOT halt the session, prompt the user, or gate any subsequent work on its outcome.

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

### Requirement: Read-only detection via tool presence and Glob

The check SHALL determine the research-tooling state using only read-only signals: the presence of code-graph MCP tools in the session's tool list, and a read-only `Glob` of a project-root `.codegraph/`. Code-graph MCP tools SHALL be recognized whether exposed unprefixed (`codegraph_*`) or harness-namespaced (`mcp__codegraph__*`); detection SHALL NOT depend on a single literal prefix. The `.codegraph/` probe SHALL be rooted at the project root, so a nested `.codegraph/` in some other directory does not by itself decide the state. The check SHALL NOT use any write or edit tool and SHALL NOT create or modify any file, consistent with explore mode being strictly read-only.

#### Scenario: detection uses only read-only probes

- **WHEN** the agent evaluates the research-tooling state
- **THEN** it inspects code-graph MCP tool presence and runs a read-only `Glob` of a project-root `.codegraph/`, and performs no file writes or edits

#### Scenario: harness-namespaced tool names are recognized

- **WHEN** the code-graph MCP tools are exposed under a harness namespace such as `mcp__codegraph__*` rather than an unprefixed `codegraph_*`
- **THEN** the agent still recognizes the code-graph MCP as present and does not fall through to the "not installed" state

### Requirement: Three-state detection with matching notice

The check SHALL classify the research-tooling state as one of exactly three states and print the matching notice:

- **not installed** — no code-graph MCP tools are present. The notice SHALL state that structural research will fall back to grep/glob/Read and SHALL recommend installing CodeGraph, naming its URL (https://github.com/colbymchenry/codegraph).
- **installed but no index** — code-graph MCP tools are present but the read-only `Glob` of a project-root `.codegraph/` returns no match. The notice SHALL state the fallback and SHALL recommend running `codegraph init -i`.
- **ready** — code-graph MCP tools are present and a project-root `.codegraph/` exists. The notice SHALL briefly state that structural research will use codegraph.

#### Scenario: no code-graph tools present

- **WHEN** the session has no code-graph MCP tools available
- **THEN** the agent prints a fallback notice recommending installation of CodeGraph and naming its URL

#### Scenario: code-graph tools present but no index

- **WHEN** code-graph MCP tools are present but a read-only `Glob` of a project-root `.codegraph/` returns no match
- **THEN** the agent prints a fallback notice recommending `codegraph init -i`

#### Scenario: code-graph tools and index both present

- **WHEN** code-graph MCP tools are present and a project-root `.codegraph/` exists
- **THEN** the agent prints a brief notice that structural research will use codegraph

### Requirement: Notice is always English

The notice text SHALL always be written in English, regardless of the dominant natural language of the conversation. This English-only rule applies to this notice only and SHALL NOT change the `sai/instructions/remember.md` language policy for any other output.

#### Scenario: non-English session still gets an English notice

- **WHEN** the `sai-explore` session's conversation language is not English
- **THEN** the research-tooling notice is still printed in English while other chat output continues to follow the `remember.md` language policy

### Requirement: Notice is visually emphasized

The notice SHALL be rendered so that it visually stands out in scrollback rather than as an unmarked plain-text line. It SHALL use markdown emphasis — at minimum a bold lead — and SHOULD present as a blockquote callout carrying a ⚠️ marker. This rendering requirement applies to all three states, so the active research mode is not missed by the user.

#### Scenario: fallback notice is emphasized

- **WHEN** the check prints a fallback notice for the not-installed or installed-but-no-index state
- **THEN** the notice is visually emphasized (a bold lead, and a blockquote callout with a ⚠️ marker) rather than an unmarked plain-text line

#### Scenario: ready notice is emphasized

- **WHEN** the check prints the ready-state notice
- **THEN** the notice is visually emphasized with at least a bold lead so it stands out in scrollback

### Requirement: Generic preference with CodeGraph-specific recommendation

The notice MAY express a generic preference for any available code-graph MCP for structural research. The actionable install and init recommendations SHALL name CodeGraph specifically and reference its URL (https://github.com/colbymchenry/codegraph). The check SHALL NOT restate or rewrite the "prefer codegraph over grep" guidance that a code-graph MCP already injects into the harness's global memory; its added value is the fallback and recommendation path only.

#### Scenario: recommendation names CodeGraph

- **WHEN** the notice recommends installing or initializing a code-graph tool
- **THEN** the recommendation names CodeGraph and references https://github.com/colbymchenry/codegraph

#### Scenario: check does not duplicate global prefer-codegraph guidance

- **WHEN** a code-graph MCP is present and already injects prefer-codegraph-over-grep guidance into the harness's global memory
- **THEN** the check does not restate or rewrite that guidance and limits its output to the state notice
