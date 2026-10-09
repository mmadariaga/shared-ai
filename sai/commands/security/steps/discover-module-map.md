# Security Step — Discover Module Map

Active step: discover-module-map. Map modules, entry points, trust boundaries, and the SCA gate for the selected scope. The step is done when every file in the selected scope is assigned to a module and every dependency manifest has its SCA gate decision; then report the `discover-module-map` progress event per the worker contract.

### Discovery & Module Mapping

1. **Read the change artifacts** first and note the accepted trade-offs (`common.md` § Input). They anchor every later step.
2. **Collect the selected scope.** For diff mode:
    - File list: `git diff --name-status {parent-branch}...HEAD`
    - Line count: `git diff --stat {parent-branch}...HEAD` (no content — just totals)
    - **If total LOC ≤ 500:** load the full diff with `git diff {parent-branch}...HEAD` and review directly.
    - **If total LOC > 500:** do NOT load the full diff. Instead, delegate per-file inspection to **`budget-explorer`** subagents (one per file or logical group) with output contract: file:line + flaw category + ≤80 words per finding.
3. **Detect language ecosystem(s)** from extensions and manifests (`package.json`, `pom.xml`, `*.csproj`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`).
4. **Map modules** — group the files in the selected scope into deployment/compilation units.
5. **Identify the attack surface** in the selected scope: external input sources, entry points, and trust boundaries — API controllers, CLI entrypoints, message consumers, event/Lambda handlers, authn/authz layers.
6. **Decide the SCA gate** — list the dependency manifests (`pom.xml`, `package.json`, etc.) and admit each one that the diff introduces or modifies (diff mode) or that the selected scope contains (`--full` or `--path` mode). `resolve-sca` audits the admitted manifests only.

Use **`budget-explorer`** subagents in parallel when independent areas need codebase context (e.g. tracing how a tainted source flows through helpers in unchanged files). Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit.

### Not applicable

When the selected scope has no attack surface and the gate admits no manifest — an empty diff is this case — the audit does not apply. Report `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca` together in this step's progress event; `close-security-outcome` then writes the Not Applicable report.
