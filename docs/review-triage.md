# Triage in `/sai-5-review`

`/sai-5-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`, plus component-bearing markdown) → `/sai-8-accessibility`

Those recommendations are the three `**Surface touched:**` fields in `review.md`. `/sai-review` always runs review first, then dispatches an audit only when that field is `Yes`.

Standalone `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` are diff-scoped vs the parent branch by default. Pass `--full` or `--path {dir}` to expand scope; performance also accepts `--tier`, accessibility also accepts `--runtime`. `/sai-5-review` itself takes only a change name and an optional parent branch.
