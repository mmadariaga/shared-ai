# Description format

Title: imperative Conventional Commit (`feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert`,
optional scope), at most 70 characters, no emoji, no trailing period. Draft in English unless the user requests another language. Ground each
claim in committed Git changes or clearly identified supporting context; exclude
credentials and incidental private data.

Use these headings:

- `## Summary`: user-facing outcomes, not a file inventory.
- `## Goal`: purpose in one or two sentences.
- `## Design Decisions`: material decisions and their rationale when evidenced.
- `## Test plan`: checks actually run and remaining checks, clearly distinguished.
- `## Audits`: verified audit results if available; omit when not evidenced.
- `## Out of Scope / Follow-ups`: known deferred work, not invented requirements.

The ratings block of `sai/policies/inherent-risk.md` (`<!-- sai-inherent-risk:start -->` …
`<!-- sai-inherent-risk:end -->`) sits after `## Audits`, or after `## Test plan` when
`## Audits` is omitted, and before `## Out of Scope / Follow-ups`. It is the one block every
description carries; its content comes from that policy, never from the draft's own claims.

Omit empty optional sections. Do not claim a test or audit passed merely because
its document exists. For updates preserve unrelated existing content and explain
the exact replacement boundary before approval. Final drafting check: all claims
grounded, title validation passes, full description available for presentation.

The end of the description is the tool's closing block; draft above it.
