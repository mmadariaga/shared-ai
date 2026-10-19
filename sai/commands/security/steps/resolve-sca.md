# Security Step — Audit Dependencies

Active step: resolve-sca. Audit the dependency manifests the SCA gate admitted in `discover-module-map`. The step is done when every admitted manifest is audited and every vulnerable dependency is recorded; then report the `resolve-sca` progress event per the worker contract.

### SCA — Software Composition Analysis

For each admitted manifest:
1. **Extract dependencies + current versions**.
2. **Identify known CVEs** — run only read-only audit commands, when available: `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, `osv-scanner`; never install, update, or rewrite dependencies, manifests, lockfiles, production files, or configuration. Record each CVE's source: the tool that reported it, or `recalled` when no tool confirmed it.
3. **Severity** via CVSSv3: 9.0–10 = Critical, 7.0–8.9 = High, 4.0–6.9 = Medium, 1.0–3.9 = Low.
4. **Fix availability** — non-vulnerable version published?
