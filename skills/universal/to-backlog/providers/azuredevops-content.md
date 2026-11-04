# Deterministic Boards description content

The description format is a property of each work item. A new work item is
created in Markdown format: the description is sent as written, together with the
`add /multilineFieldsFormat/System.Description = Markdown` operation in the same
creation request, so tables, images and nested lists are available. An update
reads the format from the work item itself (`multilineFieldsFormat`, compared
case-insensitively with `markdown`) and never sends the format operation: a
Markdown work item receives Markdown, any other work item receives HTML, so an
update never switches an HTML work item to Markdown.

## Markdown work items

Raw HTML outside backtick code spans and fenced code blocks is rejected before
approval, naming its line, because Azure rewrites it and verification would
report a difference. The exact `backlog-id-counters` comment from
`sai/policies/issue-format.md` is the one allowed comment.

Verification and no-change detection treat the sent and stored descriptions as
equivalent when they match after entity decoding (`&quot;`, `&amp;`, `&lt;`,
`&gt;` and numeric references such as `&#128640;`, which Azure writes even inside
code fences) and, at most, the removal of the counters comment. Every other
difference stays a difference. Two Azure reads of one work item compare exactly.

## HTML work items

`azure-markdown.js` is the conversion authority. Supported: ATX headings,
paragraphs and line breaks, flat ordered/unordered lists, blockquotes, inline
code, fenced code with optional language, bold, italic, HTTP(S)/mailto inline
links, and the exact `backlog-id-counters` comment from `sai/policies/issue-format.md`.
Code is literal, HTML text is escaped, counters remain metadata.

Nested/indented blocks, tables, raw HTML, images, reference links, footnotes,
strikethrough, backslash escapes outside code, task-list markers, standalone
bracket/reference syntax and unbalanced syntax stop preparation. These forms
are explicitly unsupported, not rendered as ordinary text. Retain the draft and ask
for an explicitly agreed supported representation; do not drop content or
improvise HTML. This restricted deterministic converter adds no dependency.

Exact examples:

```text
## Goal                    => <h2>Goal</h2>
**Keep** `x < y`            => <p><strong>Keep</strong> <code>x &lt; y</code></p>
- [guide](https://a.test)   => <ul><li><a href="https://a.test">guide</a></li></ul>
```

An HTML baseline is HTML. For a title-only change omit `description` or pass
the exact unchanged baseline: its bytes are preserved and no description field
is written. For description edits agree the complete supported Markdown
replacement, preserving unaffected meaning. If that boundary cannot be met,
ask and stop until resolved. Approval binds the returned exact outgoing content,
HTML for an HTML work item and Markdown for a Markdown one.

Verification and no-change detection accept the harmless normalization Azure
applies to a stored HTML description instead of requiring exact bytes: whitespace
added between block tags (`p`, `li`, `ul`, `ol`, `h1`-`h6`, `pre`,
`blockquote`) or immediately before a block closing tag, and the removal of the
exact `backlog-id-counters` comment. Every other difference stays a real
difference: whitespace removed anywhere, whitespace added before an inline
closing tag (`b`, `i`, `a`, `code`), any whitespace change inside `<pre>` or
`<code>`, another comment, a counters comment with different values, and any
change to text, links, structure or titles. Azure drops the counters comment,
so the next update initializes the counters from the visible identifiers and
an identifier removed from the description can be reused on Azure Boards;
this limit is accepted and the counters are not stored in another form.
