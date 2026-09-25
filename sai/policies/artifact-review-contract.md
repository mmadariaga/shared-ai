# Artifact Review Contract (shared finding format)

The single source of the artifact review finding format: severity, finding shape and layout, identifiers, and the closing summary tally. Consuming surfaces cite this file instead of restating it.

## Scope

**Artifact review** is a read-only review of OpenSpec change artifacts: `proposal.md` and `specs/**` for sai-1; `design.md`, `tasks.md`, and `interfaces.md` for sai-2. Two surfaces form findings under this contract: the manual `sai-explore` post-crystallization Review Engine and the supervised in-session Explore Review Engine rounds. The spec-proposal and design workers are consumers of the resulting external findings block: they parse and apply it under this contract and form no findings of their own.

The audit commands `sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility` keep their own severity vocabularies and identifier schemes and never emit this contract's `Summary:` tally.

## Severity

Every finding carries exactly one severity from the closed set `High`, `Medium`, or `Low` — never another value such as `Critical`:

- **`High`** — a defect that, left uncorrected, would allow a materially incorrect, incomplete, or out-of-scope implementation, violate an explicit constraint, preserve a normative contradiction, or leave required behavior too untestable to implement reliably.
- **`Medium`** — a material clarity, coverage, consistency, or testability weakness that does not, on the reviewed evidence, prevent a bounded correct implementation or violate explicit scope.
- **`Low`** — a precision, readability, or maintainability improvement with no material effect on implementation correctness or scope.

## Finding shape

Every finding carries exactly five fields, in this order:

1. `Identifier` — the severity-prefixed label (see the identifier scheme below).
2. `Severity` — `High`, `Medium`, or `Low` per the criteria above; the validated source of truth.
3. `Artifact location` — the project-relative artifact path and optional section.
4. `Issue` — the reviewer's issue statement.
5. `Recommended correction` — the reviewer's recommendation.

Render each field as one list line with exactly these labels, one blank line between findings, and the summary tally last:

```
- Identifier: H1
- Severity: High
- Artifact location: openspec/changes/<name>/specs/<capability>/spec.md § <section>
- Issue: <issue statement>
- Recommended correction: <recommendation>

Summary: High=1 Medium=0 Low=0
```

The format validator (`validate-findings.js`, located per `sai/policies/tool-resolution.md`) parses exactly these labels.

## Identifier scheme

The identifier is the severity's initial (`H`, `M`, or `L`) followed by the finding's sequence number within that severity in the current review (`H1`, `H2`, `M1`, `L1`, ...). Each severity's sequence restarts at 1 in every review, so identifiers are review-scoped and carry no identity across reviews or rounds.

The `Severity` field stays the source of truth for severity validation; the identifier is a derived label. A finding whose severity is missing or outside the closed set gets no derived identifier.

## Summary tally

Every artifact review closes with the **base-form** `Summary:` line, `Summary: High=<count> Medium=<count> Low=<count>`, whose counts match the review's findings, with no other counters. A review that reports an absent artifact set without reviewing content has no findings and no `Summary:` line.
