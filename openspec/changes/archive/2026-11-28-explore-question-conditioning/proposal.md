> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-explore` asked six questions whose answer the conversation or the linked issue already held. The round-1 assignment question offered only no-ops when the authenticated user was already the sole assignee of every linked issue. The implementation-start assignment question repeated keep or replace for that same sole assignee. The backlog question asked for a publication that would write identical content when nothing had changed since the last completed publication of the same set. The downstream review invitation repeated a review the user had just requested in natural language. The maturity question was sometimes asked on a turn that already requested the edge-case review. The artifact-review language gate asked for a language the user had already stated. Each redundant question added friction, invited a no-op answer, and made the questions that carry a real decision less legible.

## What Changes

- `sai/commands/explore/steps/route-selector.md` — Round 1 asks the backlog, branch, and assignment questions only when context leaves them open; records `skip-continue` against a matching local published state; records the set-level `keep` for a verified sole-self-assignee set; keeps the published state in conversation; prints one settled-decisions notice; and resolves the completion gate on a recorded no-op answer.
- `sai/commands/explore/steps/review-loop.md` — A semantic-path turn whose dominant intent is entering the review loop starts the loop directly, in any language, without the plain-text global question; a vague mention, negation, quotation, or discussion keeps the invitation, and a specific artifact review is served first under the artifact-review gate.
- `sai/commands/explore/steps/common.md` — A turn recognized by staged progression advancement, including an explicit request to review edge cases, is never answered with the maturity question or selector.
- `sai/commands/explore/steps/artifact-review-language-gate.md` — An explicit language statement for the artifact set settles the gate before the English skip, binds to that set, and is reused for it.
- `sai/policies/backlog-implementation-start.md` — A sole-self-assignee no-op keep is a valid advance approval that needs no explicit choice and mutates nothing.
- `sai/policies/question-rounds.md` — A no-op answer recorded from the surrounding context resolves its question for the completion gate and authorizes only its no-op.
- `docs/commands/sai-explore.md` — Documents the conditioned questions and the settled-decisions notice.
- `test/backlog-slice-provider-parity.test.js`, `test/explore-contract-preservation.test.js`, `test/explore-pipeline-selector.test.js`, `test/explore-pre-crystallization-stages.test.js`, `test/explore-question-rounds.test.js`, `test/explore-question-tools.test.js`, `test/explore-step-reachability.test.js`, `test/github-backlog-slice-lifecycle.test.js` — Pin each omission and its ask path, and the untouched questions' text, order, and stable values.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-route-close`: Rounds ask only the conditional questions whose context leaves them open; a recorded no-op resolves its own question; the assignment question is omitted for a verified sole-self-assignee set; the settled-decisions notice and the conversation-scoped published state are added.
- `explore-pre-route-actions`: The backlog question is omitted against a matching local published state, and `skip-continue` is recorded instead.
- `backlog-implementation-assignment`: A sole-self-assignee no-op keep is a valid advance approval that needs no explicit choice.
- `backlog-slice-lifecycle`: Assignment verification accepts the sole-self-assignee no-op keep read-only, with no assignment mutation.
- `review-loop-navigation`: A semantic-path turn whose dominant intent enters the loop starts it without the global question.
- `explore-stage-choice-selectors`: A staged-progression turn never receives the maturity question or selector.
- `explore-review-language-gate`: An explicit language statement settles the gate before the English skip and binds to its artifact set.

## Impact

- **New files**: `openspec/changes/explore-question-conditioning/.openspec.yaml`, `openspec/changes/explore-question-conditioning/proposal.md`, `openspec/changes/explore-question-conditioning/specs/explore-route-close/spec.md`, `openspec/changes/explore-question-conditioning/specs/explore-pre-route-actions/spec.md`, `openspec/changes/explore-question-conditioning/specs/backlog-implementation-assignment/spec.md`, `openspec/changes/explore-question-conditioning/specs/backlog-slice-lifecycle/spec.md`, `openspec/changes/explore-question-conditioning/specs/review-loop-navigation/spec.md`, `openspec/changes/explore-question-conditioning/specs/explore-stage-choice-selectors/spec.md`, `openspec/changes/explore-question-conditioning/specs/explore-review-language-gate/spec.md`
- **Modified files**: `docs/commands/sai-explore.md`, `sai/commands/explore/steps/artifact-review-language-gate.md`, `sai/commands/explore/steps/common.md`, `sai/commands/explore/steps/review-loop.md`, `sai/commands/explore/steps/route-selector.md`, `sai/policies/backlog-implementation-start.md`, `sai/policies/question-rounds.md`, `test/backlog-slice-provider-parity.test.js`, `test/explore-contract-preservation.test.js`, `test/explore-pipeline-selector.test.js`, `test/explore-pre-crystallization-stages.test.js`, `test/explore-question-rounds.test.js`, `test/explore-question-tools.test.js`, `test/explore-step-reachability.test.js`, `test/github-backlog-slice-lifecycle.test.js`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
