# ADR 0170: Overview nested boundary headings are English structural anchors

<!-- adr-index: refs ddr:0124 -->

## Status

Accepted

## Context

Derived `change-overview.md` may localize free-text prose under an invocation-scoped `overview_language`. Nested Architecture Snapshot boundary headings must remain deterministic contract oracles and stable navigation anchors across languages. Treating them as editorial subsections would allow translation and weaken structural tests.

## Decision

In derived `change-overview.md` Snapshot projection, `#### External Surfaces` and `#### Internal Public Surfaces` are structural anchors in the same closed English-fixed class as the nine top-level overview headings and `### Snapshot`. They stay English regardless of `overview_language`; only free-text prose under them may localize. Scenarios that assert those literal heading strings are unambiguous under this rule.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| English-fixed nested boundary headings (chosen) | Deterministic contract tests; consistent with other fixed overview anchors | Localized overviews still show English nested headings |
| Treat headings as editorial and translate them | Fully localized document | Breaks structural tests and cross-language navigation |
| Assert only position/order without fixed literals | Weaker coupling to exact wording | Weaker oracle; inconsistent with other fixed anchors |

## Consequences

- Overview generation contract lists the two nested headings among English structural anchors.
- Contract tests may assert the literal strings under any `overview_language`.
- Complements DDR 0124's projection-only localization rule with an explicit nested-heading membership.

## Provenance

derived — `openspec/changes/split-architecture-snapshot-by-boundary/design.md`, Decision D7.
