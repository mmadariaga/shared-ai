> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Publishing a single change made the model rewrite the agreement as an issue description, which spent output tokens and could drift from the agreed text. Once every route reads the change document, publication can send the same document, and the `Ready to Propose` block format and its tool can go.

## What Changes

- `to-backlog` publishes a stored change document as it is: a request passes the verified file reference as `document` (`{document_file, document_hash}`) instead of `title` and `description`, and `sai/tools/to-backlog.js` (`resolveDocuments`) verifies the file against its hash, requires a complete change document, and fills the issue title from the `# <title>` line and the description from the rest. A request that names both a document and a title or description is refused.
- Slice-set publication (`query-set`, `query-set-update`) takes `documents`, one verified file reference per document, instead of `blocks`. `sai/tools/change-document.js` `readSet` validates the set and its dependency order and supplies each document's name, title, description, dependencies, and backlog origin. Each child issue is its change document, titled by its title line, plus the `sai-backlog-slices@1` correspondence marker, on GitHub, GitLab, and Azure DevOps (`backlog-provider-set.js`, `backlog-set-github.js`, `backlog-set-update.js`).
- Azure DevOps writes each child change document as Markdown with no fenced code wrapper and no block tags; a document with raw HTML outside code is refused before any write, and a set content update of an HTML work item converts the document to HTML.
- `sai/tools/change-document.js` gains `split` (the title and description of a verified document), `set-origin` (a private copy of a stored document whose `Backlog origin:` is the imported URL), `attach-origin` (each document of a published set receives its child URL as `Backlog origin:`, replacing an adopted parent origin and refusing any other conflict), and `sections --origin <issue-url>`, which reports the `## Change` lines of a re-imported published change document and the origin the change takes.
- A re-imported published change document takes the imported URL as its `Backlog origin:` when it has none; a different existing value is kept and reported as a warning.
- `sai/tools/ready-to-propose.js` and `sai/policies/ready-to-propose-format.md` are deleted and declared as retired paths in `sai/install-manifest.json`; `isHtmlDescription` is read from `change-document.js`; `sai/policies/issue-format.md` becomes the only definition of the format and absorbs the field rules, document preparation, registration, dispatch, and publication transport.
- `sai/tools/lint.js` replaces its `ready-to-propose` check with a `change-document` check that delegates to `change-document.js` and reports a retired block as `RETIRED_FORMAT`.
- Policies, skills, docs, `AGENTS.md`, and `GLOSSARY.md` refer to change documents instead of blocks (`backlog-origin-transport.md`, `issue-origin-preservation.md`, `stage-machine.md`, `tool-resolution.md`, `issue-intake.md`, `route-selector.md`, `from-backlog`, `to-backlog` and its providers).

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `backlog-publication`: a stored change document is published without a rewrite.
- `backlog-slice-lifecycle`: each child issue of a published slice set is its change document plus the correspondence marker; origin transport and content updates work on documents.
- `azuredevops-backlog-publication`: Azure DevOps publishes child change documents as Markdown without block tags.
- `from-backlog-conversation-import`: a re-imported published change document reports its `## Change` lines.
- `issue-origin-preservation`: origins live on the `Backlog origin:` line of `## Change`; a re-imported change document takes the imported URL as its origin.
- `ready-to-propose-detection`: the block detector is retired; `change-document.js` gains the publication and origin commands and owns the HTML detection.
- `format-linting`: the `ready-to-propose` lint check becomes the `change-document` check.

## Impact

- New files: `test/change-document-publication.test.js`, `test/helpers/change-document-fixture.js`.
- Deleted files: `sai/tools/ready-to-propose.js`, `sai/policies/ready-to-propose-format.md`, `test/ready-to-propose-detector.test.js`, `test/ready-to-propose-issue-conversion.test.js`, `test/ready-to-propose-notes-rule.test.js`.
- Modified tools: `sai/tools/change-document.js`, `sai/tools/to-backlog.js`, `sai/tools/backlog-provider-set.js`, `sai/tools/backlog-set-github.js`, `sai/tools/backlog-set-update.js`, `sai/tools/to-backlog-azuredevops.js`, `sai/tools/to-backlog-gitlab.js`, `sai/tools/from-backlog-azuredevops.js`, `sai/tools/lint.js`.
- Modified instructions and docs: `sai/policies/issue-format.md`, `sai/policies/issue-origin-preservation.md`, `sai/policies/backlog-origin-transport.md`, `sai/policies/backlog-implementation-start.md`, `sai/policies/stage-machine.md`, `sai/policies/tool-resolution.md`, `sai/commands/explore/steps/issue-intake.md`, `sai/commands/explore/steps/route-selector.md`, `skills/universal/to-backlog/SKILL.md`, `skills/universal/to-backlog/slice-set.md`, `skills/universal/to-backlog/providers/azuredevops.md`, `skills/universal/to-backlog/providers/gitlab.md`, `skills/universal/from-backlog/SKILL.md`, `sai/install-manifest.json`, `AGENTS.md`, `GLOSSARY.md`, `docs/backlog.md`, `docs/commands/to-backlog.md`.
- Modified tests: the backlog, lint, origin-preservation, explore, no-specs, plan-family, input-file, read-only-grants, and transfer test files listed in the diff.
- Known limitation: issues already published in block form are not readable as change documents; no compatibility path exists. Published specs outside the capabilities above that still cite the retired block format (for example `no-specs-changes`, `shared-crystallization-block-format`, `dispatchable-validation-profile`, `explore-open-decision-reconfirmation`, `sai-backfill-completion-handoff`) are not updated by this change.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
