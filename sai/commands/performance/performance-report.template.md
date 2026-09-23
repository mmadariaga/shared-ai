
```markdown
# Performance Report — {Feature Name}

**Change:** `openspec/changes/{change-name}/`  
**Scope:** {diff vs `{parent-branch}` | full repo | `{path}`}  
**Tiers audited:** {backend / frontend / db / queue — list only those in scope}  
**Branch:** `{current-branch}`  
**Baseline reference:** {prior benchmark / SLO / observability dashboard / "absolute thresholds — no baseline"}  
**Date:** {YYYY-MM-DD}

## Not Applicable

{Keep this section only when the change has no performance surface (no new
queries, endpoints, consumers, hot components, deps, loops over unbounded
input, or caching changes): justify it here and omit every findings section.
Otherwise delete this heading entirely — /sai-status and /sai-archive read its
presence as "audit not applicable".}

**Justification:** {Why this change has no performance surface}

---

## Executive Summary

| Severity | Backend | Frontend | DB | Queue | Total |
|----------|---------|----------|----|----|-------|
| Critical | | | | | |
| High | | | | | |
| Medium | | | | | |
| Low | | | | | |
| Informational | | | | | |
| **Total** | | | | | |

**Verdict:** {Block release | Release after Critical/High fixed | Acceptable}

**Risk posture:** {one-sentence assessment of user-visible impact}

**Clean categories:** {tier — categories evaluated with no instances detected}

---

## Hot Paths in Scope

| Path | Tier | Why it matters |
|------|------|----------------|
| `{endpoint / route / consumer / query}` | {tier} | {brief reason — traffic share, criticality, regression evidence} |

---

## Findings

### C1 [SEVERITY] {Tier}: {short title}

- **Location:** `{file}:{line}` (or `{endpoint}` / `{query id}` / `{component}`)
- **Category:** {Concurrency / Caching / N+1 / Bundle / CWV / Backpressure / ...}
- **Symptom:** {observable behavior — latency, throughput, bundle delta, query rows examined}
- **Evidence:**
    ```
    {trace excerpt / EXPLAIN output / profiler frame / bundle stat / code snippet — quote exactly}
    ```
- **Root cause:** {one or two sentences}
- **Expected impact if unfixed:** {user-visible consequence at expected load}
- **Remediation:** {specific change. If multiple options, list up to 3 with trade-offs.}
- **Expected gain:** {measured if validated, otherwise "estimated X% — verify with {method}"}
- **Validation method:** {how to confirm the fix worked — re-run EXPLAIN, Lighthouse delta, load test, metric}
- **Spec note:** {"Acknowledged in `proposal.md` §X" | "Acknowledged in `specs/{capability}/spec.md` §X" | "—"}

---

## Acknowledged Trade-offs (from change artifacts)

- {Item explicitly accepted in `proposal.md` or `design.md` and therefore not a finding, with artifact and section reference}

---

## Observability Gaps

- {`M<n>` — hot path lacking timing/metric/trace span; each gap is also a Medium finding above}

---

## Prioritized Remediation Plan

### Block release (Critical / High)
1. **{finding}** (`{location}`) — {one-line action} — est. {gain}

### Next sprint (Medium)
1. **{finding}** (`{location}`) — {one-line action}

### Backlog (Low / Informational)
1. **{finding}** (`{location}`) — {one-line action}

---

## Validation Plan

Before merging, re-measure:
- [ ] {metric} via {tool/command} — target: {threshold}
- [ ] {metric} via {tool/command} — target: {threshold}

Summary: Critical={n} High={n} Medium={n} Low={n} Informational={n}
```

