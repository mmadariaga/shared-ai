# Security Step — Discover Module Map

Active step: discover-module-map. Map modules, entry points, trust boundaries, and dependency-manifest changes for the selected scope, then report the `discover-module-map` progress event per the worker contract.

### Phase 1: Discovery & Module Mapping

1. **Read the change artifacts** first — record all explicitly accepted security trade-offs from `proposal.md` and `design.md`. These become *Acknowledged*, not findings. Anchors all later phases.
2. **Determine scope** (see Required Inputs). For diff mode:
    - File list: `git diff --name-status {parent-branch}...HEAD`
    - Line count: `git diff --stat {parent-branch}...HEAD` (no content — just totals)
    - **If total LOC ≤ 500:** load the full diff with `git diff {parent-branch}...HEAD` and review directly.
    - **If total LOC > 500:** do NOT load the full diff. Instead, delegate per-file inspection to **`budget-explorer`** subagents (one per file or logical group) with output contract: file:line + flaw category + ≤80 words per finding.
3. **Detect language ecosystem(s)** from extensions and manifests (`package.json`, `pom.xml`, `*.csproj`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`).
4. **Map modules** — group changed files into deployment/compilation units.
5. **Identify entry points & trust boundaries within diff scope ONLY**: API controllers, CLI entrypoints, message consumers, event/Lambda handlers, authn/authz layers introduced or modified in the diff. Do NOT scan unmodified files searching for boundaries.
6. **Check dependency manifests** — note whether any manifest (`pom.xml`, `package.json`, etc.) was introduced or modified in the diff. If **none** changed, skip Phase 3 entirely.

Use **`budget-explorer`** subagents in parallel when independent areas need codebase context (e.g. tracing how a tainted source flows through helpers in unchanged files). Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit.
