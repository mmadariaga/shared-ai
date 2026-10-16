# Deterministic Boards description content

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

Update baselines are HTML. For a title-only change omit `description` or pass
the exact unchanged baseline: its bytes are preserved and no description field
is written. For description edits agree the complete supported Markdown
replacement, preserving unaffected meaning. If that boundary cannot be met,
ask and stop until resolved. Approval binds the returned exact outgoing HTML.

Verification and no-change detection accept the harmless normalization Azure
applies to a stored description instead of requiring exact bytes: whitespace
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
