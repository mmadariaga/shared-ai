# Accessibility Step — Map UI Components and Framework

Active step: map-ui-framework. Discover the UI files, frameworks, component types, and design tokens in scope, then report the `map-ui-framework` progress event per the worker contract.

### Phase 1: Discovery & Component Mapping

1. **Read the change artifacts** first and record all explicitly accepted accessibility trade-offs from `proposal.md` and `design.md` as *Acknowledged*. Anchors all later phases.
2. **Determine scope** (see Required Inputs). For diff mode:
    - `git diff --name-status {parent-branch}...HEAD`
    - Filter to UI files. If empty, STOP with note.
    - If >5 UI files in scope, delegate per-component scan to **`budget-explorer`** subagents with output contract (file:line + WCAG SC + finding category + ≤80 words).
3. **Detect framework(s) in scope:**
    - React (`.tsx`, `.jsx`) — hook patterns, `React.memo`, `useRef` for focus, portals
    - Astro (`.astro`) — client directives, island hydration boundaries
    - Tailwind (utility classes) — design token contrast, focus utilities (`focus-visible:`, `focus:`)
    - Plain HTML / templates
4. **Identify component types in scope:**
    - Interactive widgets (modal, dialog, menu, dropdown, combobox, tabs, accordion, carousel, toast)
    - Forms (inputs, selects, validation surfaces)
    - Navigation (header, nav, breadcrumb, route announcer)
    - Media (img, video, audio, svg, canvas, charts)
    - Dynamic (live regions, async loaders, route changes, optimistic updates)
    - Static content (headings, landmarks, lists, tables, links)
5. **Identify design tokens in scope** — Tailwind theme colors, custom CSS variables — for contrast checks.

Use **`budget-explorer`** subagents in parallel when independent component areas need codebase context (e.g. tracing a `Modal` component reused across pages to determine impact). Each **`budget-explorer`** subagent call MUST declare an output contract: exact fields (file:line + WCAG SC + 1-line note), max-words cap (≤200), no raw code blocks returned to main. Cap total **`budget-explorer`** subagent invocations at ≤8 per audit.
