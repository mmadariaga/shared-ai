# Performance Checklist — Backend

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
- No timing/metric on the new hot path → impossible to measure later. Flag as a Medium finding even when the code is correct.
