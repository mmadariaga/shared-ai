# Performance Checklist — Database

For SQL touched in the diff (PostgreSQL or MySQL — both classic in this stack):

**Query Plans**
- For each new/modified query: recommend `EXPLAIN (ANALYZE, BUFFERS)` (Postgres) or `EXPLAIN ANALYZE` (MySQL 8+). Running it belongs to `resolve-diagnostics`.
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
