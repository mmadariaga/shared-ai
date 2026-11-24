# ADR 0230: The issue format is the only crystallized change format

## Status

Accepted. The format and its tool land first and no consumer reads them yet: the `Ready to Propose` block, its tool `sai/tools/ready-to-propose.js`, and `sai/policies/ready-to-propose-format.md` keep working until a later slice switches the consumers and retires them.

## Context

SAI kept the same agreement in two formats: the `Ready to Propose` block that `/sai-explore` crystallizes, and the backlog issue of `sai/policies/issue-format.md`. Publishing a crystallized change made the model rewrite the block as an issue, which spends output tokens and can drift from the agreed text, and re-importing an issue loses the fields that only the block carries. A single format needs a validator and a verifiable file form before any consumer can read it.

## Decision

1. **The issue format is kept, not the block format.** It already records partial agreement (`Maturity`, `Open questions`) and is the one people read. `sai/policies/issue-format.md` now defines the change document: the issue sections plus `Capabilities`, `Terms`, `Out-of-scope implementation notes`, `Alternatives considered`, `Trade-offs accepted`, `Additional notes`, and a last `## Change` section, in a fixed order.
2. **`Problem` and `Goal` replace the block's `Why` and `What`.** An existing issue section is reused whenever it has an equivalent, so no two sections say the same thing and no contradiction check is needed.
3. **`Model / Re-framings` and `Overview language` are retired.** No consumer reads their value, and the overview language is a run option (`--overview-lang`), not an agreement.
4. **Metadata is visible text in a `## Change` section placed last.** `Change name`, `Depends on`, `Specs`, `Explore origin`, and `Backlog origin` are `Key: value` lines, because hidden markers never carry block content and readers see the problem first. Section headings and these keys are always English; the crystallization language gate decides only the language of the content.
5. **Empty optional sections are omitted**, never written as `- None`, as the issue format already does. With `Maturity` at `Ready to propose`, an absent `Edge cases` or `Implementation notes` section means it was agreed empty.
6. **One file per document, hashed whole.** The first line is `# <title>` and the sha256 covers the whole file with line endings normalized to LF, because `---` is a valid Markdown horizontal rule and cannot separate documents. A fenced code block is content: a heading or `---` inside it starts and separates nothing.
7. **The validator checks completeness, not contradictions in prose.** Contradictions are handled by the agreement and update boundary of the issue format.

At the end of this run the code does this: `sai/tools/change-document.js` parses a document with a fence-aware section parser, names each failed dispatchable check (`check`, `check-set` for a slice set), flags the lines of the lexical hygiene pre-filter over the whole document for the four unchanged clauses, hashes and verifies the file (`hash`, `verify-file`), reports whether an amendment is metadata-only (`compare`), and keeps the section reading of the issue intake (`sections`). `issue-format.md` carries the extended format. The block format and `ready-to-propose.js` still serve every consumer; only the constant of optional issue sections of the old tool and the format test follow the extended policy.

## Alternatives Considered

- **Keep the block format and drop the issue format** — rejected: the block cannot record partial agreement and is not the format people read.
- **Add short `What` and `Why` sections next to `Problem` and `Goal`** — rejected: it duplicates the agreement and needs a contradiction check the validator does not do.
- **One file with documents separated by `---`** — rejected: a document may contain `---`.
- **A single change, or two slices** — rejected for review size.

## Consequences

- Spec workers receive a full `Problem` section instead of a 1–2 sentence `Why`.
- There is no compatibility with blocks already stored in `sai-state`, issues already published in block form, or changes in progress.
- Until the later slice, two tools define a crystallized change: `change-document.js` and `ready-to-propose.js`.
- Claude Code and opencode behave alike: the tool and the policy are harness-agnostic.

## Provenance

Change `change-document-format`, decision "The issue format is the only crystallized change format".
