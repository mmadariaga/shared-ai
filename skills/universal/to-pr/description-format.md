# Description format

Use an imperative Conventional Commit title, validated by `checkPrTitleRules` in
the tool. Draft in English unless the user requests another language. Ground each
claim in committed Git changes or clearly identified supporting context; exclude
credentials and incidental private data.

Use these headings, adapting the former PR description template:

- `## Summary`: user-facing outcomes, not a file inventory.
- `## Goal`: purpose in one or two sentences.
- `## Design Decisions`: material decisions and their rationale when evidenced.
- `## Test plan`: checks actually run and remaining checks, clearly distinguished.
- `## Audits`: verified audit results if available; omit when not evidenced.
- `## Out of Scope / Follow-ups`: known deferred work, not invented requirements.

Omit empty optional sections. Do not claim a test or audit passed merely because
its document exists. For updates preserve unrelated existing content and explain
the exact replacement boundary before approval. Final drafting check: all claims
grounded, title validation passes, full description available for presentation.
