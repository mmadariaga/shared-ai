# Security Step — Resolve SCA Gate

Active step: resolve-sca. Resolve the SCA gate; when it admits the phase, run the protocol below. Report the `resolve-sca` progress event per the worker contract — completed whether SCA runs or is legitimately skipped.

### Phase 3: SCA — Software Composition Analysis

**Gate.** In diff mode, SCA runs when the diff introduces or modifies a dependency manifest; in `--full` or `--path` mode, when the scope contains one. Otherwise skip this phase and state in the Executive Summary *"No dependency changes in diff — SCA skipped."* (diff mode) or *"No dependency manifests in scope — SCA skipped."* (`--full` / `--path`).

For each manifest the gate admits:
1. **Extract dependencies + current versions**.
2. **Identify known CVEs** — prefer project audit tools when available: `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, `osv-scanner`. Record each CVE's source: the tool that reported it, or `recalled` when no tool confirmed it.
3. **Severity** via CVSSv3: 9.0–10 = Critical, 7.0–8.9 = High, 4.0–6.9 = Medium, 1.0–3.9 = Low.
4. **Fix availability** — non-vulnerable version published?
5. **License risk** — flag GPL/AGPL/SSPL/LGPL in commercial projects, unknown/proprietary licenses.
