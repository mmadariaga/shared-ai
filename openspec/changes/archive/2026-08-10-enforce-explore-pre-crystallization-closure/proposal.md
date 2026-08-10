**Complexity**: high

## Why

Successful `sai-explore` turns can answer the user while leaving an active, uncrystallized idea without a relevant question or a clear path to crystallization. Require an actionable ending for that state so exploration retains conversational initiative until the idea is crystallized or explicitly discarded.

## What Changes

- Require every successful exploration response for an active, uncrystallized idea to end with a genuine unresolved question or a concise `crystallize` reminder.
- Model closure behavior with explicit chat-scoped states: active-uncrystallized, crystallized, and discarded.
- Repeat the fallback reminder on later active turns when no genuine question exists, without manufacturing uncertainty.
- Treat the required pre-crystallization reminder as phase navigation, not an unrelated follow-up proposal.
- Add contract coverage for question endings, repeated reminders, discard and crystallization boundaries, terminal failure paths, and Claude Code/opencode parity.
- Preserve the existing one-time readiness signal, explicit request gate for `Ready to Propose`, prerequisite remediation literals, review-loop silent-close allowance, and read-only exploration behavior.

## Capabilities

### New Capabilities

- `explore-pre-crystallization-closure`: Keep successful active exploration turns actionable until crystallization or explicit discard.
- `explore-closure-state`: Distinguish lifecycle states that control whether the new closure rule applies.
- `explore-closure-verification`: Verify closure behavior across ordinary turns, repeated turns, terminal paths, and both supported harnesses.

### Modified Capabilities

- `explore-crystallization-on-demand`: Keep the one-time readiness signal and explicit full-block gate while distinguishing them from a repeatable pre-crystallization closure.

## Impact

- Shared exploration behavior in `sai/instructions/explore.md`.
- Explore contract coverage in `test/explore-pipeline-supervision.test.js` and existing terminal-output patterns in `test/change-overview-contract.test.js`.
- Both `commands/claude/sai-explore.md` and `commands/opencode/sai-explore.md` must continue to consume the same closure contract without harness-specific divergence.
- No new dependency, configuration change, production-code change, or write capability is introduced.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`; `sai/policies/remember.md`; `openspec/specs/explore-crystallization-on-demand/spec.md`; `test/explore-pipeline-supervision.test.js`; `test/change-overview-contract.test.js`; `sai/commands/sai-explore.md`; `commands/claude/sai-explore.md`; `commands/opencode/sai-explore.md`; `.claude/skills/openspec-explore/SKILL.md`; `.opencode/skills/openspec-explore/SKILL.md`; `openspec/specs/explore-crystallization-block/spec.md`; `openspec/specs/explore-post-crystallization-review-loop/spec.md`; `openspec/specs/explore-pipeline-supervision/spec.md`; `AGENTS.md`; `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The existing readiness signal remains at most once per stable idea, and the full `Ready to Propose` block remains gated by an explicit crystallization request.
- A readiness signal does not itself crystallize the idea; the pre-crystallization closure remains required until the explicit request emits the block.
- The fallback reminder must contain the literal `crystallize` token and state that crystallization generates the paste-ready prompt for `/sai-1-spec`.
- The shared instruction is the parity point for Claude Code and opencode; generic project-local OpenSpec explore skills remain subordinate and are not broadened by this change.
