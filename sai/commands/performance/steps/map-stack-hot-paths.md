# Performance Step — Map Stack and Hot Paths

Active step: map-stack-hot-paths. Discover the stack components, hot paths, and baseline reference for the selected scope and tier filter, then report the `map-stack-hot-paths` progress event per the worker contract.

### Phase 1: Discovery & Stack Mapping

1. **Read the change artifacts** first and record all explicitly accepted performance trade-offs from `proposal.md` and `design.md` as *Acknowledged*. Anchors all later phases.
2. **Determine scope** (see Required Inputs). For diff mode:
    - File list: `git diff --name-status {parent-branch}...HEAD`
    - Line count: `git diff --stat {parent-branch}...HEAD` (no content — just totals)
    - **If total LOC ≤ 500:** load the full diff with `git diff {parent-branch}...HEAD` and review directly.
    - **If total LOC > 500:** do NOT load the full diff. Instead, delegate per-file inspection to **`budget-explorer`** subagents (one per file or logical group) with output contract: file:line + tier + finding category + ≤80 words per finding.
3. **Detect stack components in scope:**
    - Backend: `pom.xml`, `build.gradle`, `pyproject.toml`, `requirements.txt`, `go.mod`, framework markers (Spring, Django, FastAPI, Express, NestJS).
    - Frontend: `package.json`, build tool (Vite, Webpack, Astro, Next), framework (React, Astro), bundler config.
    - Database: ORM markers (JPA/Hibernate, Django ORM, SQLAlchemy, Prisma), migration files, schema definitions, raw SQL.
    - Queue: client libs (RabbitMQ `amqp`, Kafka, AWS SQS, Redis Streams, BullMQ, Celery, Spring `@RabbitListener`/`@KafkaListener`).
4. **Identify hot paths in scope:**
    - HTTP endpoints touched (controllers, routes, handlers)
    - Background jobs / consumers touched
    - DB queries added or modified (search for query builders, raw SQL, repository methods)
    - Frontend routes / components in critical render paths
5. **Identify baseline reference** if available: prior benchmark, SLO, p95 from observability dashboards mentioned in repo docs. If none exists, state "No baseline — findings use absolute thresholds."

Use **`budget-explorer`** subagents in parallel when independent tiers need codebase context. Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + tier + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit.
