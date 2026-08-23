# Performance Step — Resolve Performance Tier Analysis

Active step: audit-performance-tiers. Evaluate the selected scope and tier filter across the tier audits below, then report the `audit-performance-tiers` progress event per the worker contract.

### Phase 2: Backend Audit

For services in scope, evaluate:

**Concurrency & Threading**
- Blocking I/O on async/event-loop runtimes (Node.js sync `fs.*`, Python asyncio + sync requests, Spring WebFlux + blocking JDBC without `boundedElastic`)
- Thread-pool exhaustion risks (Tomcat/Undertow defaults vs expected QPS)
- Synchronous calls inside hot loops where batching/parallel applies
- Improper use of `@Async`, `CompletableFuture`, `Promise.all` (missing concurrency limits → unbounded fan-out)

**Resource Management**
- DB connection pool sizing (HikariCP `maximumPoolSize`, Django `CONN_MAX_AGE`)
- HTTP client connection pool reuse (no `RestTemplate` per request, no new `requests.Session()` per call)
- Unclosed resources (file handles, streams, prepared statements) → leaks under load
- Large in-memory collections built before streaming (load entire result set into list)

**Caching**
- Missing cache on hot read paths (no `@Cacheable`, no Redis lookup, no HTTP `Cache-Control`)
- Cache key explosion (per-user keys for shared data)
- Cache stampede risk (no single-flight, no jittered TTL)
- Stale invalidation patterns

**Serialization & Allocation**
- JSON serialization in tight loops (Jackson `ObjectMapper` reuse, `json.dumps` overhead)
- Excessive boxing / autoboxing (Java primitive vs wrapper in hot loops)
- String concatenation in loops without builder
- Defensive copies of large objects

**Algorithmic**
- O(n²) over collections that grow with input
- Re-fetching data inside loops instead of batch + map
- Sorting/filtering in app layer when DB can do it

**Observability Gaps**
- No timing/metric on the new hot path → impossible to measure later. Flag as Medium even when code is correct.

### Phase 3: Frontend Audit

For routes/components in scope, evaluate:

**Core Web Vitals (impact on)**
- **LCP** — render-blocking CSS/JS, oversized hero images, late-loading fonts, server response time, hydration delay
- **INP** — long tasks > 50ms, heavy event handlers, synchronous state cascades, expensive layouts on interaction
- **CLS** — missing `width`/`height` on images, late-injected content (banners, ads), font swap without `font-display: optional`/`swap` strategy

**Bundle & Delivery**
- Bundle size delta in the diff (run/inspect bundle analyzer if config present)
- New dependencies pulled in: tree-shakable? side-effects flag? alternatives lighter?
- Dynamic import opportunities for non-critical paths
- Duplicate dependencies (different versions of the same lib)
- Missing `loading="lazy"` on below-the-fold images
- Render-blocking `<script>` without `defer`/`async`

**React Specific**
- Missing `useMemo`/`useCallback` only where prop-identity matters (don't flag unless the child is `memo` or expensive)
- Inline object/array props causing child re-renders of `memo`'d components
- State lifted too high causing wide subtree re-renders
- Heavy work in render body instead of `useMemo` / web worker
- Missing `key` or unstable `key` on lists
- `useEffect` dependencies causing render loops

**Astro Specific**
- Client directives (`client:load`, `client:idle`, `client:visible`) overused — defaults to no JS
- Component shipped to client when island-static would suffice

**Tailwind / CSS**
- Custom CSS competing with utility-first patterns (consistency cost only — Low)
- Unused custom classes left after refactor

**Network**
- Waterfall: critical resource depending on a non-critical earlier request
- Missing `preload`/`preconnect` for critical third-party origins
- Cache headers absent on static assets
- API calls in `useEffect` that could be SSR/loader-hoisted

### Phase 4: Database Audit

For SQL touched in the diff (PostgreSQL or MySQL — both classic in this stack):

**Query Plans**
- For each new/modified query: recommend `EXPLAIN (ANALYZE, BUFFERS)` (Postgres) or `EXPLAIN ANALYZE` (MySQL 8+). If user authorizes execution, run it on a representative dataset.
- Flag: `Seq Scan` / `ALL` on tables expected to grow, missing index usage, sort spilling to disk, hash join with unexpected build side, nested loop on large outer.

**N+1**
- ORM patterns: Django `select_related`/`prefetch_related` missing, Hibernate `LAZY` collections accessed in loops, JPA without `@EntityGraph`/fetch joins, Prisma `include` opportunities.
- Code shape: `for x in xs: x.related.something` → almost certainly N+1.

**Indexes**
- New `WHERE`/`JOIN`/`ORDER BY` columns without index support
- Composite index column order mismatched with query predicate order
- Redundant indexes (covered by another)
- Index on low-cardinality column (boolean) without partial index justification
- Missing covering index for read-heavy hot path

**Schema & Types**
- `TEXT` where `VARCHAR(n)` would suffice (rarely matters in Postgres; matters in MySQL row format)
- `SELECT *` on wide tables — flag and recommend explicit columns
- Missing `NOT NULL` constraints losing planner stats
- JSON/JSONB queries without GIN index where applicable
- Foreign keys without index on the referencing column (Postgres does NOT auto-index FKs)

**Transactions & Locks**
- Long-running transactions wrapping unrelated work
- Missing `SELECT ... FOR UPDATE SKIP LOCKED` patterns where queue-like workloads need it
- Implicit serializable isolation upgrades

**Migrations**
- `ALTER TABLE` taking exclusive locks on large tables (use Postgres concurrent index, MySQL pt-osc / gh-ost patterns)
- Backfills in a single transaction
- Renaming columns without two-step deploy

### Phase 5: Queue Audit

For producer/consumer code in scope (RabbitMQ, Kafka, SQS, Redis Streams, BullMQ, Celery, etc.):

**Throughput & Backpressure**
- Consumer prefetch / `max_in_flight` tuning vs processing time
- Missing concurrency on consumer side (single-threaded loop on multi-partition topic)
- Producer batching opportunities (Kafka `linger.ms`/`batch.size`, AMQP publisher confirms in batches)
- Synchronous waits inside the consume loop blocking other messages

**Reliability**
- No idempotency key → duplicate processing risk on at-least-once delivery
- Acknowledgement before processing completes (loses messages on crash)
- Acknowledgement after long processing without heartbeat (broker requeues mid-flight)
- Missing dead-letter queue / retry policy
- Retries without exponential backoff or jitter

**Message Shape**
- Oversized payloads (broker per-message limits, network pressure) — recommend storing payload in object store + passing reference
- Schema drift without versioning

**Observability**
- No metric on queue depth / consumer lag → you will only learn about backpressure from user reports

**Worker Hygiene**
- Long-running tasks without checkpointing → restart loses work
- Memory growth across messages (consumer process leaks state)

### Phase 6: Cross-Cutting

- **Logging volume** — debug-level logging in hot paths (allocation + I/O cost)
- **Tracing** — new span coverage on the new endpoints / consumers
- **Feature flags** — branch evaluation in tight loops
- **External calls** — new third-party HTTP/RPC dependencies on the critical path; missing timeouts, missing circuit breakers
