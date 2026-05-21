# ADR 0005: Verbatim Extraction of Commit Rules into commit-rules.md

## Status

Accepted

## Context

`sai/instructions/commit.md` inlines all commit message format rules (subject format, body,
footer, hard rules, self-critique checklist) directly in its body. When extracting these rules
into a shared `commit-rules.md`, two approaches exist: copy verbatim, or reformat/paraphrase
to improve readability or consolidate structure.

## Decision

Copy the rule text verbatim from `commit.md` into `commit-rules.md`. Do not reformat, rename
headings, or merge sections.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Verbatim copy (chosen) | Zero drift, unambiguous | Slight duplication of headings |
| Reformat into terse rules | More readable | Interpretation risk, diff noise |
| JSON/YAML rules file | Machine-parseable | Agents don't parse structured data from fetched files |

## Consequences

- `commit-rules.md` content is identical in meaning to what was in `commit.md`, making the
  change verifiable by diff.
- Any future rule update touches only `commit-rules.md`; both `commit.md` and `apply.md`
  inherit via fetch with no edits required.
- A future editor cannot mistake a paraphrase for the original intent — the text is the same.
- Paraphrasing rules creates drift; reverting to a common understanding is hard once diverged.

## Related

- ADR 0003 — Fetch path convention (`@sai/instructions/` prefix) used in the new
  `Fetch @sai/instructions/commit-rules.md` directive.
- ADR 0006 — Placement decision for the fetch directive in `apply.md`.
