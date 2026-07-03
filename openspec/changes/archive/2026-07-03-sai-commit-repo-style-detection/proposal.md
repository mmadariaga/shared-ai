## Why

The rule "match the repo's commit style" is today only an advisory bullet in `commit-rules.md`, so in a repo whose recent history follows a recognisable Conventional Commits vocabulary the agent may re-invent types, scopes, and body structure instead of adopting the established convention. This change makes style detection an explicit, cheap step that feeds a detected vocabulary into message composition when a clear style exists, and falls back to the current hard-coded rules when it does not.

## What Changes

- `sai/instructions/commit.md` Step 1 gains a repo-style **detection sub-step**: one `git log -N --pretty=format:'%h %s%n---%b---END'` call (N declared in the rubric, currently 20) plus one inline parse — no subagent — computing the Conventional Commits match rate, the type/scope vocabulary actually used, the body-presence rate, and recurring body section headers.
- `sai/instructions/commit-rules.md` gains a **detection rubric**: the Conventional Commits shape it matches against, the adoption threshold (70%), the adoption branch (feed detected vocabulary into Steps 2–4), and the fallback branch (below threshold, the existing hard-coded rules remain the sole source of truth).
- Steps 2–4 consume the detected style only as a tie-breaker/refinement: prefer a detected type when the dominant type is ambiguous, prefer a detected scope that maps to the changed path prefix, and mirror the detected body/footer style when a body is emitted.
- An **optional one-line notice** (`Detected repo style: …`) reports which style was adopted or that the agent fell back; off by default.
- Explicit flags (`--type`, `--scope`, `--no-body`, `--amend`) keep their current override semantics — user input always wins over detected style. Hard limits (subject ≤ 50, body wrap 72, no emoji, no `Co-Authored-By`/"Generated with…" trailers) and the faithfulness rule are unchanged.

## Capabilities

### New Capabilities

- None. The detection rubric and step live in existing capabilities (`commit`, `commit-rules`).

### Modified Capabilities

- `commit`: Step 1 (Inspect Staged State) adds an inline repo-style detection sub-step feeding a detected style into Steps 2–4; the optional notice line; no subagent; faithfulness and existing stop conditions unchanged.
- `commit-rules`: adds the detection rubric (Conventional Commits shape, scan window N=20, adoption threshold=70%, both declared in the rubric), the adoption branch, the fallback branch, and explicit precedence of flags and hard limits over detected style.

## Impact

- `sai/instructions/commit.md` — detection sub-step added inside Step 1; Steps 2–4 reference the detected style as a refinement; no new files.
- `sai/instructions/commit-rules.md` — detection rubric added; existing "Match the repo's commit style" advisory bullet updated to point at the rubric; all hard limits retained verbatim.
- Wrappers `commands/{claude,opencode}/sai-commit.md` and `sai/commands/sai-commit.md` — no change (no model/routing change), so no mirror PR work.
- No impact to project source code, CI, or other sai commands.

## Proposal Research Documentation

**Local files**: `sai/instructions/commit.md`, `sai/instructions/commit-rules.md`, `openspec/specs/commit/spec.md`, `openspec/specs/commit-rules/spec.md`, `openspec/changes/archive/2026-05-21-extract-commit-rules-shared-instruction/proposal.md`

**External URLs**: none

## Additional Notes

- The recurring body section headers this repo uses (e.g. `Spec changes:`, `Instruction changes:`, `Archived:`, `Includes backfilled…`, `Refactored … to`) are ordinary body content, not git trailers. Note: they are distinct from the forbidden `Co-Authored-By` / "Generated with Claude Code" trailers, which remain banned even under adoption.
- The Conventional Commits shape used for the match rate is `^<type>(\(<scope>\))?: <subject>$`.
- N (scan window) and the adoption threshold are fixed values declared in the rubric, not runtime flags — adjusting them means editing `commit-rules.md`.
- Adoption never relaxes classification faithfulness: a detected type is used only to break a genuine tie in Step 2, never to override a type the staged diff clearly dictates.
- The optional notice is off by default; the proposal leaves the toggle mechanism to a future flag rather than adding one now.
