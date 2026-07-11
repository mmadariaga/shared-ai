# tasks-routing-metadata Specification

## Purpose
TBD - created by archiving change tasks-routing-metadata. Update Purpose after archive.
## Requirements
### Requirement: Each tasks.md step SHALL include a Routing line

Every `## Step N:` section in `tasks.md` SHALL contain a single Routing line formatted as:

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

The line SHALL appear immediately after the `## Step N: <title>` heading and BEFORE `**Files Affected**`. The line is the only routing metadata emitted by `tasks.md`; the file SHALL NOT contain a separate routing block, table, JSON sidecar, or `routing.md`.

The middle dot character (·, U+00B7) SHALL be used as the pair separator. ASCII alternatives (`,`, `|`, `/`) are NOT acceptable substitutes.

The three keys (`layer`, `discipline`, `complexity`) SHALL be present on every Routing line, in that order, each followed by `=` and a token drawn from the enumeration in the corresponding requirement of this spec. A reader SHALL be able to identify which dimension a value belongs to without assuming the token's position in the line.

The three tokens SHALL be drawn from the enumerations defined in the subsequent requirements of this spec.

A trailing parenthetical one-line justification MAY follow the three key=value pairs for audit (e.g. `layer=frontend · discipline=ui-ux · complexity=medium (Next.js component)`). When present, the parenthetical begins with `(` and ends with `)` and SHALL be ignored by any parser of the Routing line — only the three key=value pairs are part of the routing tuple.

#### Scenario: Step has a Routing line in the correct position
- **WHEN** `sai-2-design` writes a `## Step N` section in `tasks.md`
- **THEN** the section contains a line of the form `**Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>` with three key=value pairs whose keys are exactly `layer`, `discipline`, `complexity` in that order
- **THEN** the line precedes the `**Files Affected**` line in the same section

#### Scenario: Exactly three dimensions on the line
- **WHEN** the Routing line is emitted
- **THEN** the line contains exactly three key=value pairs: layer, discipline, complexity
- **THEN** the `parallelizable` dimension is not present (excluded from this change)

#### Scenario: Optional parenthetical justification
- **WHEN** the design agent appends a one-line audit note
- **THEN** the note follows the three key=value pairs as a single `(... )` group
- **THEN** the parser SHALL ignore anything from the first `(` onward on the line
- **THEN** the parenthetical is optional; its absence MUST NOT make the line invalid

#### Scenario: No separate routing artifact
- **WHEN** a reader inspects the change directory for routing metadata
- **THEN** the only routing artifact is the `**Routing**` line on each step
- **THEN** no `routing.md`, no routing table, no routing JSON sidecar, and no per-step machine-readable block is present

### Requirement: Layer vocabulary is a closed enumeration

The `<layer>` token SHALL be one of the following four values, and only these values:

- `frontend` — frontend code lives here. Paths typically include `src/components/`, `src/pages/`, `src/router/`, `src/store/`, `src/api-client/`, `web/`, `client/`, `mobile/`, `app/` (when frontend), `pages/` (when Next.js), and framework entry points whose body is client-side.
- `backend` — server-side code lives here. Paths typically include `server/`, `api/`, `services/`, `src/handlers/`, `src/repos/`, `src/models/`, `src/db/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `migrations/`, `prisma/`.
- `infra` — build, CI/CD, deployment, container, infrastructure-as-code, repository tooling, agent/skill wrappers. Paths typically include `.github/`, `Dockerfile`, `scripts/`, `infra/`, `terraform/`, `k8s/`, harness `commands/`, harness `agents/`, harness `skills/`. Pure declarative artifacts (config files, markdown docs) also fall under `infra` because they do not belong to either the frontend or backend runtime.
- `cross-cutting` — escape hatch for steps that touch more than one of `frontend`, `backend`, or `infra` in a non-trivial way, or for steps whose primary layer is genuinely ambiguous. The orchestrator (out of scope) must split the step or assign a generalist agent.

#### Scenario: Layer assigned by path pattern
- **WHEN** a step's `**Files Affected**` lists paths
- **THEN** the design agent assigns a single `<layer>` token from the enumeration above using the path-driven rules in the design instructions
- **THEN** if the paths span more than one of `frontend` / `backend` / `infra` in a non-trivial way, the layer is `cross-cutting`

#### Scenario: Layer for a docs-only step
- **WHEN** all files in `**Files Affected**` are markdown (`*.md`, `*.mdx` outside a UI surface) under `docs/`, `README.md`, or another prose-only location
- **THEN** the layer is `infra` (declarative artifact, not frontend or backend runtime)
- **THEN** the discipline (per the discipline requirement) is `config`

#### Scenario: Layer for a config-only step
- **WHEN** all files in `**Files Affected**` are configuration files (`.json` / `.yaml` / `.yml` / `.toml` / `.env` / `.ini` / `.properties` / declarative `.config.{js,ts}`) AND no file contains executable logic
- **THEN** the layer is `infra`
- **THEN** the discipline is also `config`

#### Scenario: No new layer tokens invented
- **WHEN** a step would naturally belong to a layer not enumerated above (e.g. `ml`, `firmware`, `data-pipeline`)
- **THEN** the design agent MUST NOT invent a new token
- **THEN** the design agent MUST either pick the closest enumerated token or use `cross-cutting`, and MUST flag the gap in `design.md` Open Questions for a future change

### Requirement: Discipline vocabulary is a closed enumeration orthogonal to layer

The `<discipline>` token SHALL be one of the following five values, and only these values. Discipline is orthogonal to layer: every (layer, discipline) pair is legal, and the pair discriminates between routings that share a layer (e.g. `(frontend, ui-ux)` vs `(frontend, app-code)`) and routings that share a discipline across layers.

- `ui-ux` — UI/UX sensibility (presentation, layout, styles, view templates, view-only logic, accessibility). File patterns: `components/`, `views/`, `pages/` (when view markup), `layouts/`, `*.css`, `*.scss`, `*.less`, `*.html`, `*.mdx`, `*.astro`, `*.vue`, `*.svelte` (with markup), `*.tsx`/`*.jsx` with view markup, `a11y*` files.
- `app-code` — client-side non-UI code (routing, state stores, data layer, client SDK, framework glue, build/bundler config consumed by the frontend). File patterns: `src/store/`, `src/router/`, `src/api-client/`, frontend glue directories, `vite.config.*` / `webpack.config.*` / `rollup.config.*` when frontend, frontend-only test files under frontend test directories.
- `service` — server-side business logic (HTTP handlers, RPC services, business logic, queues, scheduled jobs, server middleware). File patterns: `server/`, `api/` (when code), `services/` (when code), `src/handlers/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `*Handler*`, `*Service*` (code), `*Controller*`, `*UseCase*`, `*Job*`, `*Worker*`, `*Queue*`.
- `data` — persistence layer (schemas, migrations, repositories, ORM models, DAOs, query files). File patterns: `src/repos/`, `src/models/`, `src/db/`, `migrations/`, `schemas/`, `prisma/`, `*.sql`, `*Repo*`, `*Model*`, `*Dao*`, `*Entity*`, ORM definition files.
- `config` — declarative artifacts (JSON / YAML / TOML / env / INI / properties files, declarative `.config.{js,ts}` files, markdown documentation outside a UI surface). File patterns: `*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.env`, `*.ini`, `*.properties`, `docs/**/*.md` (when docs-only), `README.md` (when standalone), `CHANGELOG*`, `*.config.{js,ts}` when declarative.

#### Scenario: Discipline derived from path patterns
- **WHEN** a step's `**Files Affected**` contains only files matching a `ui-ux` pattern
- **THEN** the discipline is `ui-ux`
- **WHEN** a step's `**Files Affected**` contains only files matching a `service` pattern
- **THEN** the discipline is `service`
- **WHEN** a step's `**Files Affected**` contains only files matching a `data` pattern
- **THEN** the discipline is `data`
- **WHEN** a step's `**Files Affected**` contains only files matching an `app-code` pattern
- **THEN** the discipline is `app-code`
- **WHEN** a step's `**Files Affected**` contains only files matching a `config` pattern
- **THEN** the discipline is `config`

#### Scenario: Layer-discipline orthogonality
- **WHEN** a step touches `src/components/Foo.tsx` (frontend code with view markup)
- **THEN** the layer is `frontend` AND the discipline is `ui-ux`
- **THEN** a future orchestrator can dispatch this step to an agent that handles FE with UI/UX sensibility, distinct from `(layer=frontend, discipline=app-code)` for an FE router or state-store step
- **WHEN** a step touches `src/router/index.ts` (frontend routing code, no markup)
- **THEN** the layer is `frontend` AND the discipline is `app-code`
- **WHEN** a step touches `src/handlers/OrderHandler.ts`
- **THEN** the layer is `backend` AND the discipline is `service`
- **WHEN** a step touches `src/repos/OrderRepo.ts`
- **THEN** the layer is `backend` AND the discipline is `data`
- **WHEN** a step touches only `README.md`
- **THEN** the layer is `infra` AND the discipline is `config`

#### Scenario: No new discipline tokens invented
- **WHEN** a step would naturally belong to a discipline not enumerated above (e.g. `add`, `modify`, `refactor`, `fix`, `chore`, `perf`, `style`, `build`, `test-only`, `migrate`)
- **THEN** the design agent MUST NOT invent a new token
- **THEN** the design agent MUST pick the closest enumerated discipline (most often `service` for backend, `app-code` for frontend, `config` for tooling) and MUST flag the gap in `design.md` Open Questions for a future change

### Requirement: Complexity vocabulary is a three-tier coarse judgment

The `<complexity>` token SHALL be one of the following three values, and only these values:

- `low` — single file, single concern, no cross-module impact; the orchestrator can run the step in one short pass.
- `medium` — multiple files in the same layer, or one file with cross-module impact; the orchestrator should budget an iteration or two.
- `high` — cross-layer, architectural, risky, touches public APIs, breaking schema change, multi-repo coordination, or introduces a new dependency; the orchestrator should budget multiple iterations and consider splitting.

#### Scenario: Complexity is a coarse design-time judgment
- **WHEN** the design agent assigns a complexity token
- **THEN** the token is derived once from the planned file snapshot (file count, layer spread, public-API touch, breaking-change risk)
- **THEN** the token is emitted on the Routing line and not revised by the design agent

#### Scenario: sai-3-implement may refine the complexity
- **WHEN** `sai-3-implement` reads the Routing line and judges the work larger or smaller than the design-time token suggests
- **THEN** `sai-3-implement` MAY split, merge, or otherwise refine the step in `implementation.md` without re-tagging `tasks.md`
- **THEN** the original Routing line in `tasks.md` stays unchanged

### Requirement: Routing tokens are descriptive, not an agent roster

The tokens in the Routing line SHALL be descriptive dimensions of the work (layer, discipline, complexity). The vocabulary MUST NOT bind to any specific agent name, model identifier, or vendor. The orchestrator (a future change) is responsible for mapping the descriptive tokens to its own agent roster at dispatch time.

#### Scenario: No agent names in the Routing line
- **WHEN** a reader parses the Routing line
- **THEN** the three key=value pairs can be interpreted without knowing any specific agent name, model literal, or vendor
- **THEN** the orchestrator can map the tokens to its own agent roster at dispatch time

#### Scenario: Orchestrator owns the mapping
- **WHEN** the orchestrator (out of scope for this change) reads the Routing line
- **THEN** the orchestrator applies its own mapping from descriptive tokens to agents
- **THEN** the design agent does not need to know which agents exist

### Requirement: Derivation is reproducible and audit-friendly

The derivation rules that map a step's `**Files Affected**` to the three Routing tokens SHALL be expressible as a deterministic procedure (layer path patterns, discipline path patterns, complexity heuristics, a precedence list for ambiguity, a brief justification note per token). A second design agent given the same `**Files Affected**` list and the derivation rubric SHALL produce the same Routing line.

#### Scenario: Same inputs, same Routing line
- **WHEN** two design agents independently process the same change
- **THEN** they produce the same `<layer>`, `<discipline>`, and `<complexity>` tokens for every step
- **THEN** any disagreement is a defect in the derivation rubric, not in the inputs

#### Scenario: Routing line carries a one-line justification
- **WHEN** a Routing line is emitted
- **THEN** a parenthetical one-line justification MAY follow each line (e.g. `layer=frontend · discipline=ui-ux · complexity=medium (Next.js component)`) to support audit
- **THEN** the justification is optional and the parser MUST ignore anything from the first `(` onward

### Requirement: No consumer is built in this change

This spec introduces the metadata only. The change MUST NOT add a router, dispatcher, or any code that reads the Routing line. Downstream phases (`sai-3-implement` and any future orchestrator) MAY read the line, but doing so is out of scope for this change.

#### Scenario: No routing-aware code is added
- **WHEN** a reader searches the repository for code that consumes `**Routing**:` lines
- **THEN** no such consumer exists in this change
- **THEN** the metadata is present in `tasks.md` only; no behavior in the pipeline depends on it yet

