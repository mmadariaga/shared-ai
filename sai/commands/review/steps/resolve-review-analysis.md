# Review Step — Resolve Review Analysis

Active step: resolve-review-analysis. Perform review passes 1–10 against the scoped diff, then report the `resolve-review-analysis` progress event per the worker contract.

### Step 2: Review the Changes

For every modified file, perform a multi-pass review against the categories below. Use **`budget-explorer`** subagents in parallel when independent areas of the diff need codebase context (e.g. checking how a modified function is called elsewhere, verifying a pattern is consistent with existing code). Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per review.

Review categories (apply each pass to the full diff):

1. **Domain Alignment** — Does the change fulfill the feature goal in `proposal.md`? Does it satisfy the per-capability acceptance criteria in `specs/**/*.md`? Does it contradict any recorded decision? Is anything in scope that was explicitly discarded?
2. **Correctness & Bugs** — Logic errors, off-by-one, null/undefined handling, race conditions, incorrect API usage, broken edge cases.
3. **Security (triage only — DO NOT deep audit)** — Detect whether the diff touches **security surface**:
     - Authentication / authorization paths
     - User input parsing, deserialization, file/path handling
     - Dynamic queries (SQL/LDAP/NoSQL/command shells)
     - Crypto, secrets, tokens, sessions, cookies
     - HTTP boundaries (new endpoints, headers, CORS, redirects)
     - New or upgraded dependencies
     - Logging that may capture sensitive data
     Your job here is **not** to perform SAST/SCA. Only flag *surface touched: yes/no* and list the specific files. If yes, recommend `/sai-6-security` in the report. Do not raise individual security findings unless they are blatant (e.g. literal hardcoded password, SQL string concatenation in plain sight) — those go as Critical with a note that `/sai-6-security` will cover the rest.
4. **Performance (triage only — DO NOT deep audit)** — Detect whether the diff touches **performance surface**:
     - New or modified DB queries / ORM access (N+1 risk, missing indexes)
     - New HTTP endpoints, controllers, or hot-path handlers
     - New or modified message producers / consumers (queue throughput, backpressure, ack timing)
     - Frontend routes / components in critical render paths (LCP/INP/CLS impact, bundle delta)
     - New dependencies (bundle size, transitive cost)
     - Loops or data transformations over user-controlled or unbounded inputs
     - Caching layers added, removed, or invalidated
     Your job here is **not** to run EXPLAIN, profile, or measure CWV. Only flag *surface touched: yes/no* and list the specific files. If yes, recommend `/sai-7-performance` in the report. Do not raise individual performance findings unless they are blatant (e.g. nested loop on a known-large collection, `SELECT *` inside a per-row loop, render-blocking `<script>` without `defer`) — those go as High or Critical with a note that `/sai-7-performance` will cover the rest.
5. **Accessibility (triage only — DO NOT deep audit)** — Detect whether the diff touches **UI surface**:
     - Files with extensions `.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`
     - Component-bearing markdown
     - Interactive widgets, forms, navigation, media, dynamic-SPA, visual-design tokens, route announcements
     Your job here is **not** to run axe, lighthouse, or manual SR testing. Only flag *surface touched: yes/no* and list the specific files. If yes, recommend `/sai-8-accessibility` in the report. Do not raise individual a11y findings unless blatant (e.g. `<img>` without alt, click handler on `<div>` with no role/keyboard) — those go as High or Critical with a note that `/sai-8-accessibility` will cover the rest.
6. **Maintainability** — SOLID violations, unjustified coupling, duplication, unclear naming, dead code, leaked abstractions, missing or misleading comments where the WHY is non-obvious. When two code-quality practices conflict, cite the **Code Quality Priority Stack** in `sai/commands/implement/instructions.md` as the resolution order rather than re-deriving a tie-breaker.
7. **Testing** — Are new code paths covered? Do tests assert real behavior or just call the code? Are integration boundaries (DB, HTTP, queues) exercised where the project's convention requires it?
8. **Consistency with Codebase** — Does the change follow existing architectural patterns, naming, error handling, and logging conventions discoverable in the repo? Does it respect the Expertise Profile from the change artifacts?
9. **Domain Language Consistency** — Only if `GLOSSARY.md` exists at repo root: delegate to a **`budget-explorer`** subagent — include the `<glossary_format>` block from context in the subagent prompt — and return ≤30 canonical terms (Language, Relationships, Example dialogue, Flagged ambiguities sections). Then check new identifiers (classes, functions, files, variables) against those terms. Flag deviations as Low. If no `GLOSSARY.md`, skip this category entirely.
10. **Documentation & Migrations** — Are ADRs/DDRs, READMEs, OpenAPI/typedefs, or DB migrations updated when the change requires it?
11. **Mutation Analysis** — Verify test *sensitivity* (not just coverage) by mutating diff-scoped production code and checking whether the test suite catches each mutation. This pass **writes to the working tree and runs tests**, so it is NOT executed inside this read-only step: run it under the dedicated active `resolve-mutation-analysis` step file when its pointer arrives (activation gate, two-tier detection, safety protocol, dispatch contract). Step 4 renders its outcomes.
