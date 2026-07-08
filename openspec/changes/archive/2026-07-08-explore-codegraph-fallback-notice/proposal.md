## Why

`sai-explore` scans code with grep/glob/Read unconditionally, while CodeGraph — a local code-graph MCP that cuts research cost/tokens/tool-calls — is only mentioned passively in `README.md:356`. A user running an explore session has no signal about whether a faster structural-research path is available or how to enable it. The goal is to *inform* the user of the active research mode, not to change the search algorithm.

## What Changes

- Add a **one-time, non-blocking research-tooling check** at the start of every `sai-explore` session, before any code search.
- The check evaluates three states from code-graph MCP tool presence (tools matching the code-graph MCP, e.g. `codegraph_*` or the harness-namespaced `mcp__codegraph__*`) plus a read-only `Glob` of a project-root `.codegraph/`:
  - **not installed** (no code-graph MCP tools) → print a fallback notice and recommend installing CodeGraph (https://github.com/colbymchenry/codegraph).
  - **installed but no index** (tools present, no `.codegraph/`) → print a fallback notice and recommend running `codegraph init -i`.
  - **ready** (tools present + `.codegraph/` exists) → print a brief notice that structural research will use codegraph.
- The notice text is **always English**, regardless of the conversation language, and is **visually emphasized** (e.g. a blockquote callout with a bold lead and a ⚠️ marker) so it stands out in scrollback.
- The preference is generic (prefer any available code-graph MCP), but the install/init recommendation names CodeGraph specifically.

## Capabilities

### New Capabilities
- `explore-codegraph-fallback-notice`: at the start of each `sai-explore` session (once, before any code search), detect the code-graph MCP state from code-graph MCP tool presence (`codegraph_*` or the harness-namespaced `mcp__codegraph__*`) plus a read-only `Glob` of a project-root `.codegraph/`, then print one English, visually emphasized notice for the detected state — a fallback notice recommending install when no tools are present, a fallback notice recommending `codegraph init -i` when tools are present but no index exists, or a brief "structural research will use codegraph" notice when both are present. The check is non-blocking and read-only.

### Modified Capabilities
<!-- none -->

## Impact

- **Instruction files** (edited downstream by implement/apply, not in this spec phase): the logic lives inline in `sai/instructions/explore.md`. No shared instruction file is created and no other `sai-*` command is touched.
- **Read-only and non-blocking**: the check never halts the session and never writes files (explore mode is strictly read-only). Detection uses only tool-presence inspection + `Glob`.
- **No production code, no artifact schema change.** Behavior is purely an informational chat notice at session start.
- Does **not** rewrite the "prefer codegraph over grep" guidance that CodeGraph already injects into the harness's global memory; SAI's added value is the fallback + recommendation path.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`, `sai/commands/sai-explore.md`, `sai/instructions/remember.md`, `README.md` (line 356, Third Party Tools section), `openspec/changes/archive/2026-07-06-explore-review-language-gate/` (format reference for an explore-scoped capability)

**External URLs**: none consulted during the spec phase; the recommended install URL (https://github.com/colbymchenry/codegraph) is taken from the existing `README.md` reference.

## Additional Notes

- **Detection is best-effort from tool presence.** "Code-graph MCP available" means the agent can see code-graph MCP tools in its tool list for this session; the tool name may be exposed unprefixed (`codegraph_*`, per CodeGraph's own docs) or harness-namespaced (`mcp__codegraph__*`, as Claude Code typically exposes MCP tools), so detection MUST accept either form rather than a single literal prefix. "Index present" means a read-only `Glob` of a **project-root** `.codegraph/` returns a match (a nested `.codegraph/` elsewhere does not decide the state). The spec fixes the three states and their notices, and leaves the exact detection heuristic to `sai-2-design` / `explore.md`.
- **Generic preference, specific recommendation.** The notice may prefer any available code-graph MCP, but the actionable install/init recommendation names CodeGraph and its URL, matching the existing `README.md` reference.
- **English-only notice** intentionally diverges from `remember.md:4` (chat mirrors the user's input language) for this one notice; the divergence is scoped to this notice text only and does not change `remember.md` or any other output.
- **Visual emphasis** was an explicit user refinement: the notice must stand out in scrollback (bold lead, and preferably a ⚠️ blockquote callout) so the active research mode is not missed. The spec fixes "must be emphasized" and leaves exact glyph/markdown choices to `sai-2-design` / `explore.md`.
- **Non-goal**: applying this check to `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, or backfill. Scope is `sai-explore` only.
- Explore mode is read-only, so the check MUST NOT use any write/edit tool; `Glob` is the only filesystem probe permitted.
