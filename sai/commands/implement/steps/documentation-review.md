# Implement Step — Documentation Review

Active step: documentation-review. Read the documentation your Steps need and confirm conventions, then report the `documentation-review` progress event per the worker contract.

### Read what the Steps need (one time only)

Apply the Planning Evidence rule in `steps/common.md`. Each entry of `## Required Documentation` in `tasks.md` is a starting point: the path or URL is the text before ` — `, and the note guides the reading.
- Local file paths: read the relevant ones directly, in parallel when there are several.
- External URLs: use web fetch.

Once the relevant documents are read, validate them against the Expertise Profile. A document a Step needs that is missing from disk is a gap: handle it by the Planning Evidence rule. If a document contradicts the declared stack, return `needs_input` naming the document and the contradiction.
