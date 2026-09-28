# Review Step — Resolve Review Analysis

Active step: resolve-review-analysis. The step is done when every pass below has a recorded outcome (findings, no surface, or skipped) for every changed file; then report the `resolve-review-analysis` progress event per the worker contract.

Apply each pass to the full diff. Delegate codebase-context lookups (how a modified function is called elsewhere, whether a pattern matches existing code) to **`budget-explorer`** subagents in parallel, each with the output contract `file:line` + one-line note, ≤200 words, no raw code blocks. In delegated review mode (diff over 500 changed lines), inspect each file group recorded by the scope step through one **`budget-explorer`** with the output contract `file:line` + pass category + ≤80 words per finding. All of these dispatches share a cap of eight per review.

1. **Domain Alignment** — Does the change fulfill the feature goal in `proposal.md` and the acceptance criteria in `specs/**/*.md`? Does it contradict a recorded decision, or bring in something explicitly discarded?
2. **Correctness & Bugs** — Logic errors, off-by-one, null/undefined handling, race conditions, incorrect API usage, broken edge cases.
3. **Security triage** — Flag *surface touched: yes/no* and list the files when the diff touches:
   - authentication or authorization paths
   - user input parsing, deserialization, file or path handling
   - dynamic queries (SQL/LDAP/NoSQL/command shells)
   - crypto, secrets, tokens, sessions, cookies
   - HTTP boundaries (new endpoints, headers, CORS, redirects)
   - new or upgraded dependencies
   - logging that may capture sensitive data

   On yes, recommend `/sai-6-security`. The deep audit (SAST/SCA) is that command's; here raise an individual finding only for a blatant defect (a literal hardcoded password, SQL string concatenation in plain sight), as Critical with a note that `/sai-6-security` covers the rest.
4. **Performance triage** — Flag *surface touched: yes/no* and list the files when the diff touches:
   - new or modified DB queries or ORM access (N+1 risk, missing indexes)
   - new HTTP endpoints, controllers, or hot-path handlers
   - new or modified message producers or consumers (throughput, backpressure, ack timing)
   - frontend routes or components in critical render paths (LCP/INP/CLS, bundle delta)
   - new dependencies (bundle size, transitive cost)
   - loops or data transformations over user-controlled or unbounded inputs
   - caching layers added, removed, or invalidated

   On yes, recommend `/sai-7-performance`. Profiling, EXPLAIN, and Core Web Vitals are that command's; here raise an individual finding only for a blatant defect (a nested loop over a known-large collection, `SELECT *` inside a per-row loop, a render-blocking `<script>` without `defer`), as High or Critical with a note that `/sai-7-performance` covers the rest.
5. **Accessibility triage** — Flag *surface touched: yes/no* and list the files when the diff touches:
   - `.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css` files
   - component-bearing markdown
   - interactive widgets, forms, navigation, media, dynamic SPA behavior, visual-design tokens, route announcements

   On yes, recommend `/sai-8-accessibility`. axe, Lighthouse, and screen-reader testing are that command's; here raise an individual finding only for a blatant defect (`<img>` without `alt`, a click handler on a `<div>` with no role or keyboard support), as High or Critical with a note that `/sai-8-accessibility` covers the rest.
6. **Maintainability** — SOLID violations, unjustified coupling, duplication, unclear naming, dead code, leaked abstractions, missing or misleading comments where the WHY is non-obvious. When two code-quality practices conflict, cite the **Code Quality Priority Stack** in `sai/commands/implement/steps/common.md` as the resolution order rather than re-deriving a tie-breaker.
7. **Testing** — Are new code paths covered? Do tests assert real behavior or just call the code? Are integration boundaries (DB, HTTP, queues) exercised where the project's convention requires it?
8. **Consistency with Codebase** — Does the change follow the architectural patterns, naming, error handling, and logging conventions discoverable in the repo, and the `## Implementation Context` (Stack, Conventions, Avoid) in `tasks.md` when that file exists?
9. **Domain Language Consistency** — Only when `GLOSSARY.md` exists at the repo root: have one **`budget-explorer`** return ≤30 canonical terms from its Language, Relationships, Example dialogue, and Flagged ambiguities sections, passing it the `<glossary_format>` block from your context. Check new identifiers (classes, functions, files, variables) against those terms and flag deviations as Low. Without `GLOSSARY.md`, record the pass as skipped.
10. **Documentation & Migrations** — Are ADRs/DDRs, READMEs, OpenAPI/typedefs, or DB migrations updated where the change requires it?
11. **Resilience** — the single owner of retry, timeout, circuit-breaker, idempotency, and fallback defects; passes 2 and 4 leave those to it. Its surface is external I/O, retryable handlers, consumers and queues, and timeout boundaries. A diff without that surface (docs, comments, CSS or UI without I/O, renames) is recorded as no surface, with no findings. On the surface, flag:
    - unbounded retries on paths with cascade, loss, or duplication risk;
    - missing timeouts on critical I/O;
    - missing idempotency where a retry, redelivery, or double submit is possible;
    - absent fallback where impact warrants it.

    Severity: Critical only for cascade or outage, data loss, or duplicate side effects with concrete impact; otherwise High, Medium, or Low by blast radius. When the repo has no existing pattern for the case, cap the finding at Question or Low. Resilience is a deep pass, not a triage: it adds no audit recommendation.
12. **Mutation Analysis** — test sensitivity measured by the declared deterministic mutation engine. It runs in the `resolve-mutation-analysis` step when its pointer arrives, because it writes to the working tree and runs tests; the report step renders its outcomes.
