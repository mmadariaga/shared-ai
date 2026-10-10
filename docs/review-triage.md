# Triage in `/sai-5-review`

`/sai-5-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`, plus component-bearing markdown) → `/sai-8-accessibility`

Those recommendations are the three `**Surface touched:**` fields in `review.md`. `/sai-review` always runs review first, then dispatches an audit only when that field is exactly `Yes`. `No` leaves the audit inactive; any other value is illegible, so the audit does not run and the summary carries a warning. When `review.md` is missing or no field is legible, the command reports the gap, shows the changed files, and offers no fix round.

Standalone `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` are diff-scoped vs the parent branch by default. Pass `--full` or `--path {dir}` to expand scope; performance also accepts `--tier` and `--runtime`, accessibility also accepts `--runtime`. Every review and audit command accepts the parent branch only as `--parent-branch <branch>`, and runs unattended unless `--runtime` is passed. `/sai-5-review` itself takes only a change name and `--parent-branch`: it reviews the diff.

`/sai-review` accepts the union of those options and passes each segment only the options its own command declares (in `sai/commands/{review,security,performance,accessibility}/options.md`). `--full` or `--path` skips the triage and runs all three audits, since they ask to look beyond the diff; an empty-diff review still ends the run with no audits. An option aimed at an audit that did not run has no effect, and the summary says so. An option no segment accepts stops the command before any dispatch.
