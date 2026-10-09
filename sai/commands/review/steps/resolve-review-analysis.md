# Review Step — Resolve Review Analysis

Active step: resolve-review-analysis. The step is done when the three surface outcomes (security, performance, accessibility) and the findings list are settled, with the eleven passes applied to every changed file; then report the `resolve-review-analysis` progress event per the worker contract.

Apply each pass to the full diff. A pass with nothing to report stays silent: it leaves nothing in the report. Delegate codebase-context lookups (how a modified function is called elsewhere, whether a pattern matches existing code) to **`budget-explorer`** subagents in parallel, each with the output contract `file:line` + one-line note, ≤200 words, no raw code blocks. In delegated review mode, inspect the file groups the scope step recorded, as that step directs. All dispatches of the review share a cap of eight.

Audit recommendations come only from passes 3 to 5: each flags *surface touched: yes/no* and, on yes, recommends its audit. A **blatant defect** — a defect in the pass's domain obvious from the diff alone, such as a literal hardcoded password (security), a `SELECT *` inside a per-row loop (performance), or an `<img>` without `alt` (accessibility) — is also raised as an individual finding, Critical for security and High or Critical for performance and accessibility, with a note that the dedicated audit covers the rest.

1. **Domain Alignment** — Does the change fulfill the feature goal in `proposal.md` and the acceptance criteria in `specs/**/*.md`? Does it contradict a recorded decision, or bring in something explicitly discarded? An uncovered goal or acceptance criterion is a finding, with severity by impact; scope creep is a `Question`. Report each gap or addition once: when it already contradicts a recorded decision, report it as that contradiction.
2. **Correctness & Bugs** — Logic errors, off-by-one, null/undefined handling, race conditions, incorrect API usage, broken edge cases.
3. **Security triage** — Flag *surface touched: yes/no* when the diff touches:
   - authentication or authorization paths
   - user input parsing, deserialization, file or path handling
   - dynamic queries (SQL/LDAP/NoSQL/command shells)
   - crypto, secrets, tokens, sessions, cookies
   - HTTP boundaries (new endpoints, headers, CORS, redirects)
   - new or upgraded dependencies
   - logging that may capture sensitive data

   On yes, recommend `/sai-6-security`.
4. **Performance triage** — Flag *surface touched: yes/no* when the diff touches:
   - new or modified DB queries or ORM access (N+1 risk, missing indexes)
   - new HTTP endpoints, controllers, or hot-path handlers
   - new or modified message producers or consumers (throughput, backpressure, ack timing)
   - frontend routes or components in critical render paths (LCP/INP/CLS, bundle delta)
   - new dependencies (bundle size, transitive cost)
   - loops or data transformations over user-controlled or unbounded inputs
   - caching layers added, removed, or invalidated

   On yes, recommend `/sai-7-performance`.
5. **Accessibility triage** — Flag *surface touched: yes/no* when the diff touches:
   - `.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css` files
   - component-bearing markdown
   - interactive widgets, forms, navigation, media, dynamic SPA behavior, visual-design tokens, route announcements

   On yes, recommend `/sai-8-accessibility`.
6. **Maintainability** — SOLID violations, unjustified coupling, duplication, unclear naming, dead code, leaked abstractions, missing or misleading comments where the WHY is non-obvious. When two code-quality practices conflict, cite the **Code Quality Priority Stack** in `sai/commands/implement/steps/common.md` as the resolution order rather than re-deriving a tie-breaker.
7. **Testing** — Are new code paths covered? Do tests assert real behavior or just call the code? Are integration boundaries (DB, HTTP, queues) exercised where the project's convention requires it?
8. **Consistency with Codebase** — Does the change follow the architectural patterns, naming, error handling, and logging conventions discoverable in the repo, and the `## Implementation Context` (Stack, Conventions, Avoid) in `tasks.md` when that file exists?
9. **Domain Language Consistency** — Only when `GLOSSARY.md` exists at the repo root: Fetch @sai/policies/glossary-format.md, then have one **`budget-explorer`** return ≤30 canonical terms from its Language, Relationships, Example dialogue, and Flagged ambiguities sections, passing it the `<glossary_format>` block from your context. Check new identifiers (classes, functions, files, variables) against those terms and flag deviations as Low.
10. **Documentation & Migrations** — Are ADRs/DDRs, READMEs, OpenAPI/typedefs, or DB migrations updated where the change requires it?
11. **Resilience** — the single owner of retry, timeout, circuit-breaker, idempotency, and fallback defects; passes 2 and 4 leave those to it. Its surface is external I/O, retryable handlers, consumers and queues, and timeout boundaries. A diff without that surface (docs, comments, CSS or UI without I/O, renames) yields no findings. On the surface, flag:
    - unbounded retries on paths with cascade, loss, or duplication risk;
    - missing timeouts on critical I/O;
    - missing idempotency where a retry, redelivery, or double submit is possible;
    - absent fallback where impact warrants it.

    Severity: Critical only for cascade or outage, data loss, or duplicate side effects with concrete impact; otherwise High, Medium, or Low by blast radius. When the repo has no existing pattern for the case, cap the finding at Question or Low.
