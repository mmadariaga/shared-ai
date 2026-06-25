## Why

After sai-1-spec and sai-2-design finish writing artifacts, the user must read 200–800 lines of proposal.md/specs/design.md to detect errors before approving. A one-screen structured summary printed at the end of each phase cuts review time and surfaces the highest-risk items (scope cuts, technical choices, resolved open questions) first.

## Out of Scope

- **No persistent artifacts**: the summary is print-only — nothing is written to `openspec/changes/{name}/` (no new `summary.md`, no decision-log, no machine-parseable schema). The summary targets a human reviewer at review time.
- **No wrapper changes**: `commands/opencode/*`, `commands/claude/*`, `commands/copilot/*` are unaffected. The summary lives in the `sai/commands/` body, which all three harnesses fetch.
- **No instruction-file changes**: `sai/instructions/*` is not edited. In particular, `spec.propose.md`'s existing Completion semantics (artifact-scope discipline) are orthogonal to the print block.
- **No OpenSpec schema change**: the proposal/spec/design markdown schemas and `.openspec.yaml` structure are untouched.
- **No conversational context in summaries**: per Isolation Mode, the summary is derived exclusively from artifacts just written to disk, never from prior chat.

## What Changes

- Append a decision-summary print block to the Completion section of `sai/commands/sai-1-spec.md` (Scope + Requirements blocks, ~15 lines max).
- Append a decision-summary print block to the Completion section of `sai/commands/sai-2-design.md` (flat list: decisions, risks, resolved open questions, ~15 lines max).
- The existing "done" / "next-step" message remains the LAST line printed in both phases.
- No new files in `openspec/changes/{name}/` — the summary is print-only, derived from artifacts just written.
- No changes to wrapper files (`commands/opencode/*`, `commands/claude/*`, `commands/copilot/*`) — the change is internal to `sai/commands/` body files.

## Capabilities

### New Capabilities

- `spec-quality`: A decision-summary print block appended to the Completion section of `sai/commands/sai-1-spec.md`. After all spec artifacts are written and before the mandatory stop message, the agent prints a structured summary with Scope (capabilities in scope, one line each) and Requirements (key requirements per capability, one line each) blocks. Hard cap ~15 lines; derived from proposal.md and specs just written.
- `design-quality`: A decision-summary print block appended to the Completion section of `sai/commands/sai-2-design.md`. After all design artifacts are written and before the handoff prompt, the agent prints a structured summary with Decisions (one line each), Risks (one line each), and Resolved Open Questions (one line each) blocks. Hard cap ~15 lines; derived from design.md and tasks.md just written.

### Modified Capabilities

None.

## Impact

- **Modified files**: `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md`
- **No wrapper changes**: `commands/opencode/*`, `commands/claude/*`, `commands/copilot/*` are unaffected — the decision summary is part of the command body, not the wrapper.
- **No new artifacts**: The summary is print-only; nothing is written to `openspec/changes/{name}/`.
- **Mirror discipline**: Since the change is in `sai/commands/` (fetched by all wrappers), no per-harness mirroring is needed.

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-1-spec.md`
- `sai/commands/sai-2-design.md`
- `sai/instructions/spec.propose.md`
- `sai/instructions/design.md`
- `sai/instructions/prereqs.md`
- `sai/instructions/remember.md`

**External URLs**: None

## Additional Notes

- The decision summary is derived from the artifacts just written, not from prior conversation (Isolation Mode constraint).
- The existing "done" / "next-step" message must remain the LAST line printed — the summary precedes it.
- The summary format differs per phase: spec-quality uses Scope + Requirements blocks; design-quality uses a flat list (decisions, risks, resolved open questions).
- One line per decision/requirement/risk; hard cap ~15 lines per phase.
