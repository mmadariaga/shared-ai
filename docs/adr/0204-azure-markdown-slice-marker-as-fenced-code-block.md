# ADR 0204: Azure Markdown work items carry the slice marker as a fenced code block

## Status

Accepted

## Context

A published slice set records its structure in a `sai-backlog-slices@1` marker inside the description of the parent and of every child, so `from-backlog`, `lookup-slice`, and the set update can resolve the correspondence from the issues alone. GitHub and GitLab keep the marker as a hidden HTML comment. Azure DevOps work items stored HTML, and Azure removes HTML comments from a description, so an Azure HTML work item holds the marker as a visible escaped `<pre>` block that survives its HTML handling.

Azure work items are now created in Markdown format. An Azure Markdown description keeps what it is given, with two relevant rewrites measured against a real work item: it still removes HTML comments, and it stores `"` as `&quot;` even inside a code fence (it also encodes non-BMP characters as numeric character references). A hidden comment cannot carry the marker on a Markdown work item, and a `<pre>` block would be raw HTML inside Markdown, which Azure re-serializes and the publication verification would report as a difference.

The description format is a property of each work item, read from the work item on every update, so one slice set can hold items of both formats: an originating work item that already exists keeps the format it has.

## Decision

1. **A Markdown work item carries the marker as a fenced code block.** `encodeMarkdown` in `sai/tools/backlog-slice-identity.js` writes the `sai-backlog-slices@1 {...}` line inside a fence that `fenced` makes longer than any backtick run in its content.
2. **`decode` reads the fenced form after entity decoding.** It decodes `&quot;`, `&amp;`, `&lt;`, `&gt;`, and numeric references with the one helper in `sai/tools/azure-markdown.js`, then matches a fence whose only content line is the marker. It keeps reading the escaped `<pre>` form of HTML work items and the comment form of GitHub and GitLab, and more than one marker in a description is ambiguous.
3. **Every work item a slice set creates is Markdown and carries the fenced marker**, with the child block as a fenced code block and the links as Markdown lines. An existing originating work item keeps its own format: a Markdown origin is rewritten in Markdown, an HTML origin in HTML with `<pre>`, and its update never sends the format operation. A set update writes each work item in its own format.
4. **GitHub and GitLab are unchanged.** Their marker stays the hidden comment.

## Alternatives Considered

- **The hidden HTML comment marker on Markdown work items** — rejected: Azure DevOps removes HTML comments, so the correspondence would be lost on the first read.
- **One marker form for GitHub, GitLab, and Azure DevOps** — rejected: it widens the change and requires migrating already published issues of every provider.

## Consequences

- Changing the marker form later requires migrating published work items: the three forms (comment, `<pre>`, fenced block) coexist in published issues and `decode` has to keep reading all of them.
- A published Markdown set item holds a visible code block in its description; that is the cost of a marker Azure keeps.
- The marker survives Azure's entity encoding only because `decode` entity-decodes before matching; a reader that skips that step cannot find it.
- Mixed-format sets are possible (a Markdown parent with HTML children, or an HTML origin with Markdown children), and each item is verified with the equivalence of its own format.

## Provenance

Change `azure-devops-markdown-descriptions`, decision "Azure Markdown work items carry the slice marker as a fenced code block".
