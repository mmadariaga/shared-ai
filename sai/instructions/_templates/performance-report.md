
```markdown
# Performance Report — {Feature Name}

**Change:** `openspec/changes/{change-name}/`  
**Scope:** {diff vs `{parent-branch}` | full repo | `{path}`}  
**Tiers audited:** {backend / frontend / db / queue — list only those in scope}  
**Branch:** `{current-branch}`  
**Baseline reference:** {prior benchmark / SLO / observability dashboard / "absolute thresholds — no baseline"}  
**Date:** {YYYY-MM-DD}

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

---

## Hot Paths in Scope

| Path | Tier | Why it matters |
|------|------|----------------|
| `{endpoint / route / consumer / query}` | {tier} | {brief reason — traffic share, criticality, regression evidence} |

---

## Findings

### [SEVERITY] {Tier}: {short title}

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

- {Hot path lacking timing/metric/trace span — must be added regardless of finding count}

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
```

