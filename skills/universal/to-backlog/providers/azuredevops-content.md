# Deterministic Boards description content

`azure-markdown.js` is the conversion authority. Supported: ATX headings,
paragraphs and line breaks, flat ordered/unordered lists, blockquotes, inline
code, fenced code with optional language, bold, italic, HTTP(S)/mailto inline
links, and the exact `backlog-id-counters` comment from issue-format.md.
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
