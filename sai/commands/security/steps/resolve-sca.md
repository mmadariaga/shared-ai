# Security Step — Resolve SCA Gate

Active step: resolve-sca. Resolve the manifest-change gate; when it admits the phase, execute the SCA protocol below. Report the `resolve-sca` progress event per the worker contract — completed whether the SCA path runs or is legitimately skipped.

### Phase 3: SCA — Software Composition Analysis

**Only execute if dependency manifests were modified in the diff.** If none changed, skip this phase and state in the Executive Summary: *"No dependency changes in diff — SCA skipped."*

For each modified manifest:
1. **Extract dependencies + current versions**.
2. **Identify known CVEs** (correlate with CVE/NVD knowledge; prefer project audit tools when available: `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, `osv-scanner`).
3. **Severity** via CVSSv3: 9.0–10 = Critical, 7.0–8.9 = High, 4.0–6.9 = Medium, 1.0–3.9 = Low.
4. **Fix availability** — non-vulnerable version published?
5. **License risk** — flag GPL/AGPL/SSPL/LGPL in commercial projects, unknown/proprietary licenses.
