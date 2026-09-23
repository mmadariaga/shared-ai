# Spec Step — Research

Active step: research. Research until you can write the change, then return the
`research` progress event.

## Research guide

1. **Codebase** — related features, affected files and services, existing
   architectural and implementation patterns.
2. **Documentation** — relevant docs, READMEs, ADRs and DDRs, and the root
   `GLOSSARY.md`: plan in its terms and challenge ambiguous language.
3. **External dependencies** — required APIs, SDKs, and platform tools, from
   official documentation only, fetched through a `budget-explorer`.
4. **Design patterns** — similar features whose proven patterns the change can
   reuse.

Ground every claim about code in a file read during this run, by you or by a
subagent.

Stop research once you are ~80% confident you can state every requirement and
scenario the change needs.

## Handoff input

A creation run's `Ready to Propose` block may carry `file:line` provenance in
**Why** or **Decisions & Rationale**, and entries in **Research Leads**. Treat
them as premises to confirm and extend: they start your research and never
replace it, and the stop criterion above still decides when research ends.

- Validate each cited path or range, inspect it, and follow related code and
  docs beyond it. Research Leads are starting points, not a closed inspection
  list, a scope, or a target-file selection.
- When a source contradicts or under-supports the premise it is cited for,
  including a range that now points at unrelated content, reject the premise
  and write specs from what current sources support.
- When a cited path no longer resolves (deleted or renamed), research that item
  from scratch.
- When Research Leads are absent, `- None`, or insufficient, research normally.
- Provenance cites intent and Research Leads guide investigation; neither adds
  a target-file or "where to modify" field to any artifact. Implementation
  targeting belongs to later phases.
