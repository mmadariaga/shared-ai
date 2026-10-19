# Accessibility Step — Map UI Components and Framework

Active step: map-ui-framework. Discover the UI files, frameworks, component types, and design tokens in scope. The step is done when it has recorded five results: `UI files in scope`, `frameworks detected`, `component types`, `design tokens`, and `accepted trade-offs`, each as a list or `none`. Then report the `map-ui-framework` progress event per the worker contract.

### Phase 1: Discovery & Component Mapping

1. **Read the change artifacts** first and record all explicitly accepted accessibility trade-offs from `proposal.md` and `design.md` as *Acknowledged*. Anchors all later phases.
2. **Apply the scope** resolved at startup per `common.md` § Scope. For diff mode:
    - `git diff --name-status {parent-branch}...HEAD`
    - Filter to UI files (an empty set was already closed at startup with the Not Applicable report).
    - If >5 UI files in scope, delegate per-component scan to **`budget-explorer`** subagents with output contract (file:line + WCAG SC + finding category + ≤80 words).
3. **Detect framework(s) in scope:**
    - React (`.tsx`, `.jsx`) — hook patterns, `React.memo`, `useRef` for focus, portals
    - Astro (`.astro`) — client directives, island hydration boundaries
    - Tailwind (utility classes) — design token contrast, focus utilities (`focus-visible:`, `focus:`)
    - Vue (`.vue`) — template directives, component props and events
    - Svelte (`.svelte`) — markup bindings, event handlers, transitions
    - Plain HTML / templates
    - Any other framework the UI files use
4. **Identify component types in scope:**
    - Interactive widgets, triggers no checklist (modal, dialog, menu, dropdown, combobox, tabs, accordion, carousel, toast)
    - `forms` (inputs, selects, validation surfaces)
    - Navigation, triggers no checklist (header, nav, breadcrumb, route announcer)
    - `media` (img, video, audio, svg, canvas, charts)
    - `dynamic content` (live regions, async loaders, route changes, optimistic updates)
    - Static content, triggers no checklist (headings, landmarks, lists, tables, links)
5. **Identify design tokens in scope** — Tailwind theme colors, custom CSS variables — for contrast checks.

Use **`budget-explorer`** subagents in parallel when independent component areas need codebase context (e.g. tracing a `Modal` component reused across pages to determine impact). Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + WCAG SC + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit.
