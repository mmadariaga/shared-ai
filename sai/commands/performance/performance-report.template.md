```markdown
# Performance Report — {Feature Name}

**Scope:** {diff vs `{parent-branch}` | full repo | `{path}`} · **Tiers:** {backend / frontend / db / queue — only the tiers audited} · **Baseline:** {prior benchmark / SLO / observability dashboard | absolute thresholds — no baseline} · **Date:** {YYYY-MM-DD}

{Write a section only when it has content: omit every section with nothing to record instead of filling it with "N/A" or an empty table.}

{Every number in a finding is measured or carries the mark `estimated — verify with {method}`; a measured number replaces the estimate when a diagnostic ran. A Critical or High finding may carry estimated numbers: severity follows user-visible impact.}

## Not Applicable

{Keep this section only when the diff is empty or the selected scope (after `--tier`) has no performance surface — no new queries, endpoints, consumers, hot components, dependencies, loops over unbounded input, or caching changes: the report is then the title, the provenance line, and this section, with no findings and no tally line. Otherwise delete this heading entirely — /sai-status and /sai-archive read its presence as "audit not applicable".}

**Justification:** {Why the selected scope has no performance surface; name the tier filter when it excluded the touched surface}

---

## Findings

### C1 [SEVERITY] {Tier}: {short title}

- **Location:** `{file}:{line}` (or `{endpoint}` / `{query id}` / `{component}`)
- **Category:** {Concurrency / Caching / N+1 / Bundle / CWV / Backpressure / Observability / ...}
- **Symptom:** {observable behavior — latency, throughput, bundle delta, query rows examined}
- **Evidence:**
    ```
    {trace excerpt / EXPLAIN output / profiler frame / bundle stat / code snippet — quote exactly}
    ```
- **Root cause:** {one or two sentences}
- **Expected impact if unfixed:** {user-visible consequence at expected load}
- **Remediation:** {specific change. If multiple options, list up to 3 with trade-offs.}
- **Expected gain:** {expected improvement from the remediation}
- **Validation method:** {how to confirm the fix worked — re-run EXPLAIN, Lighthouse delta, load test, metric}
- **Spec note:** {"Acknowledged in `proposal.md` §X" | "Acknowledged in `specs/{capability}/spec.md` §X" | "—"}

---

## Acknowledged Trade-offs (from change artifacts)

> Optional. Include only the accepted trade-offs you evaluated and relied on.

- {Item explicitly accepted in `proposal.md` or `design.md` and therefore not a finding, with artifact and section reference}

---

Summary: Critical={n} High={n} Medium={n} Low={n} Informational={n}
```
