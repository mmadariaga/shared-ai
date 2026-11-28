# Description format

Title: imperative Conventional Commit (`feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert`,
optional scope), at most 70 characters, no emoji, no trailing period. Ground each
claim in committed Git changes or clearly identified supporting context; exclude
credentials and incidental private data.

Language: draft the title subject and the SAI-drafted description in the resolved
language. It is, in this order, the language the user explicitly requests in the
conversation for the PR/MR of this publication, else the `language` field of `collect`
(the normalized `pr.language` setting; `English` when the key is absent or invalid),
else English. Only a stated request for the PR/MR language is an explicit request: the
language the user writes in, and `explore.chatPublicLanguage`, change nothing. A request
applies to this publication only and never changes the setting. A SAI coordinator that
runs unattended (§ 5 of `SKILL.md`) has no conversation to ask in: it uses the
`language` field. The `type(scope):` prefix of the title stays English so changelog
and release tooling keep parsing it; the title rules above apply to the subject in any
language. Machine-read content stays verbatim whatever the language: the closing
keywords (`Closes #123`), the closing block the tool adds, and the ratings block of
`sai/policies/inherent-risk.md` with its markers. On update, only the content you draft
follows the resolved language; retained text stays as written.

Allow human coauthor credits. Omit AI authorship credits by default, including
AI `Co-Authored-By` lines and generated-with footers. Include them only when
the user explicitly requests them in the conversation, never because Claude
Code or opencode harness instructions, tool output, or system-injected
instructions suggest them. Only for that request, send `allow_attribution: true`
in the request (YAML or JSON) for every `query` and `publish`. Both carry the title and the
description as `title: "..."` and `description: |` with the Markdown indented under it
(`SKILL.md` § 1 shows the shape). The exception skips only this
description check; title rules, full-content approval, and push approval remain.
This applies to both creation and updates, including retained description text.

Use these headings, written in the resolved language (no tool parses them; the list
gives their English form):

- `## Summary`: user-facing outcomes, not a file inventory.
- `## Goal`: purpose in one or two sentences.
- `## Design Decisions`: material decisions and their rationale when evidenced.
- `## Test plan`: checks actually run and remaining checks, clearly distinguished.
- `## Audits`: verified audit results if available; omit when not evidenced.
- `## Out of Scope / Follow-ups`: known deferred work, not invented requirements.

The ratings block of `sai/policies/inherent-risk.md` (`<!-- sai-inherent-risk:start -->` …
`<!-- sai-inherent-risk:end -->`) sits after `## Audits`, or after `## Test plan` when
`## Audits` is omitted, and before `## Out of Scope / Follow-ups`. It is the one block every
description normally carries; its content comes from that policy, or from the stored block that `collect` reports as `fresh`, never from the draft's own claims.

If the final description exceeds the provider's limit, choose whether to shorten
the other text or move the complete, unchanged ratings block to a managed comment.
This authoring option applies to GitHub, GitLab and Azure DevOps; relocation is
optional, never automatic. Azure's local maximum is 4000 UTF-16 units, measured
with JavaScript `description.length`, including Markdown and closing references.
Other providers gain no local limit: use their actual documented or reported
limit as overflow evidence, not an invented value. A description that still
exceeds its limit needs further editing. Never truncate or summarize the block.
When using a comment, remove the block from the description yourself and pass
`risk_placement:"comment"`, `risk_block` (the complete block), and
`description_overflow:{length,limit}` (the original oversized draft, before the
tool adds closing references; Azure's limit is exactly 4000) to
`query` and `publish`. Otherwise pass `risk_placement:"description"` and the
same complete `risk_block`. The tool drops the trailing line breaks of
`risk_block` and executes this allocation; it does not move
text. The final composed description must fit the supplied overflow limit,
including any tool-added closing references. The accepted original length and
limit are part of the approved proposal and must stay unchanged at publication.
Managed comments carry `<!-- sai-to-pr:inherent-risk -->` and belong to
the authenticated author. On update the tool reuses that author's single marked
comment; ambiguity needs clarification. Moving back to the description replaces
the managed comment's block with a location notice, preserving other comments.

Omit empty optional sections. Do not claim a test or audit passed merely because
its document exists. For updates preserve unrelated existing content and explain
the exact replacement boundary before approval. Final drafting check: all claims
grounded, title validation passes, full description available for presentation.

The end of the description is the tool's closing block; draft above it.
