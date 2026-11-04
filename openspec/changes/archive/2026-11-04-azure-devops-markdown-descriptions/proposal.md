> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The Azure DevOps provider of `to-backlog` converted every Markdown draft to HTML through a restricted converter (`sai/tools/azure-markdown.js`) that rejects tables, images, nested lists, and raw HTML, while the GitHub and GitLab providers already publish Markdown unchanged. Azure DevOps Services can store a work item description as Markdown, so new work items no longer need the lossy conversion.

## What Changes

- A new Azure Boards work item is created in Markdown format: the creation request sends the description unconverted together with the `add /multilineFieldsFormat/System.Description = Markdown` operation in the same request, so tables, images, and nested lists are no longer rejected (`sai/tools/to-backlog-azuredevops.js`).
- The description format is read from each work item (`multilineFieldsFormat["System.Description"]`, compared case-insensitively with `markdown`) in the read the update path already performs. An update of a Markdown work item sends Markdown; an update of any other work item sends HTML through the existing converter with its existing rejections. An update never sends the format operation, so it never switches an HTML work item to Markdown.
- A Markdown description is checked before approval: raw HTML outside backtick code spans and fenced code blocks is rejected, naming its line, because Azure DevOps rewrites raw HTML (`checkMarkdown` in `sai/tools/azure-markdown.js`). The exact `backlog-id-counters` comment stays allowed.
- Verification, no-change detection, and lost-creation recovery treat a sent and a stored Markdown description as equivalent only when they match after entity decoding (`&quot;`, `&amp;`, `&lt;`, `&gt;`, and numeric character references) and, at most, removal of the counters comment. HTML work items keep the existing harmless-normalization rule. One entity-decoding helper (`decodeEntities` in `sai/tools/azure-markdown.js`) serves the slice marker decoder, the publication comparison, and the import.
- Slice-set publication creates every work item of the set in Markdown format: child blocks are fenced code blocks, relationship lines are Markdown lines, and the `sai-backlog-slices@1` marker is a fenced code block. An originating work item keeps its own format and never receives the format operation: a Markdown origin is rewritten in Markdown, an HTML origin in HTML (`sai/tools/backlog-provider-set.js`, `sai/tools/backlog-set-origin.js`, `sai/tools/to-backlog-azuredevops.js`).
- `sai/tools/backlog-slice-identity.js` gains `fenced` and `encodeMarkdown`, and `decode` recognizes the fenced marker form after entity decoding, beside the `<pre>` and comment forms.
- A published set content update (`sai/tools/backlog-set-update.js`) no longer pre-converts the parent description and writes each Azure work item in its own format, so a Markdown parent with HTML children, or the reverse, is updated without mixing formats.
- `from-backlog` returns a Markdown work item with `description_format: markdown` and its description entity-decoded, and an HTML work item as before; when the response carries no `multilineFieldsFormat` key, the deterministic HTML detector decides and defaults to Markdown (`sai/tools/from-backlog-azuredevops.js`).
- The `ready-to-propose.js` HTML detection sets aside backtick code spans and fenced code blocks before looking for structural HTML tags, and exports `isHtmlDescription`.
- Provider instructions and user documentation describe the per-work-item format.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `azuredevops-backlog-publication`: new work items are created in Markdown format, updates follow each work item's own format, raw HTML is rejected in Markdown descriptions, Markdown descriptions verify after entity decoding, and slice sets create Markdown work items with fenced blocks and markers.
- `backlog-slice-lifecycle`: the `sai-backlog-slices@1` marker has a fenced code block form for Markdown Azure work items, and set content updates write each Azure work item in its own format.
- `from-backlog-azure-devops`: import reports the description format of each work item and returns Markdown descriptions entity-decoded.
- `ready-to-propose-detection`: issue HTML detection ignores tags inside code spans and fenced code blocks and treats doubt as Markdown.

## Impact

Modified files:

- `sai/tools/azure-markdown.js`
- `sai/tools/backlog-provider-set.js`
- `sai/tools/backlog-set-origin.js`
- `sai/tools/backlog-set-update.js`
- `sai/tools/backlog-slice-identity.js`
- `sai/tools/from-backlog-azuredevops.js`
- `sai/tools/ready-to-propose.js`
- `sai/tools/to-backlog-azuredevops.js`
- `skills/universal/from-backlog/providers/azuredevops.md`
- `skills/universal/to-backlog/providers/azuredevops-content.md`
- `skills/universal/to-backlog/providers/azuredevops.md`
- `docs/backlog.md`
- `docs/commands/to-backlog.md`
- `test/azure-publication.test.js`
- `test/backlog-set-update.test.js`
- `test/backlog-slice-provider-parity.test.js`
- `test/from-backlog-azuredevops.test.js`
- `test/ready-to-propose-issue-conversion.test.js`

Only Azure DevOps Services is targeted; there is no HTML fallback for Azure DevOps Server. GitHub and GitLab publication and their slice marker are unchanged. Tables, images, and nested lists are available only on new or already Markdown work items; updates of existing HTML work items keep the converter's rejections. The normalization model rests on one experiment against a real work item.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
