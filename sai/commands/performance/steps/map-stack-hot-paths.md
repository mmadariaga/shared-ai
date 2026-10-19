# Performance Step — Map Stack and Hot Paths

Active step: map-stack-hot-paths. Discover the stack components, hot paths, and baseline reference for the selected scope. The step is done when every file of the selected scope is assigned a tier or recorded as having no performance surface, and the stack components per tier, the hot paths, the baseline reference, and the accepted trade-offs exist; then report the `map-stack-hot-paths` progress event per the worker contract.

1. **Read the change artifacts** first and record the accepted trade-offs (`common.md` § Input). They anchor every later step.
2. **Collect the selected scope.** For diff mode:
    - File list: `git diff --name-status {parent-branch}...HEAD`
    - Line count: `git diff --stat {parent-branch}...HEAD` (no content — just totals)
    - **If total LOC ≤ 500:** load the full diff with `git diff {parent-branch}...HEAD` and review directly.
    - **If total LOC > 500:** do NOT load the full diff. Instead, delegate per-file inspection to **`budget-explorer`** subagents (one per file or logical group) with output contract: file:line + tier + finding category + ≤80 words per finding.
3. **Detect stack components in the selected scope:**
    - Backend: `pom.xml`, `build.gradle`, `pyproject.toml`, `requirements.txt`, `go.mod`, framework markers (Spring, Django, FastAPI, Express, NestJS).
    - Frontend: `package.json`, build tool (Vite, Webpack, Astro, Next), framework (React, Astro), bundler config.
    - Database: ORM markers (JPA/Hibernate, Django ORM, SQLAlchemy, Prisma), migration files, schema definitions, raw SQL.
    - Queue: client libs (RabbitMQ `amqp`, Kafka, AWS SQS, Redis Streams, BullMQ, Celery, Spring `@RabbitListener`/`@KafkaListener`).
4. **Identify hot paths in the selected scope:**
    - HTTP endpoints touched (controllers, routes, handlers)
    - Background jobs / consumers touched
    - DB queries added or modified (search for query builders, raw SQL, repository methods)
    - Frontend routes / components in critical render paths
5. **Identify the baseline reference** if available: prior benchmark, SLO, p95 from observability dashboards mentioned in repo docs. If none exists, the baseline is "absolute thresholds — no baseline".

Use **`budget-explorer`** subagents in parallel for file inspection and for context lookups when independent tiers need codebase context. Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + tier + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit, file inspections and context lookups together.

### Not applicable

When the diff is empty, or the selected scope (after `--tier`) has no performance surface — no new queries, endpoints, consumers, hot components, dependencies, loops over unbounded input, or caching changes — the audit does not apply. Report `resolve-performance-scope`, `map-stack-hot-paths`, `audit-performance-tiers`, and `resolve-diagnostics` together in this step's progress event; `close-performance-outcome` then writes the Not Applicable report, naming the tier filter in its justification when the filter excluded the touched surface.
