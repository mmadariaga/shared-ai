# Accessibility Step — Resolve Static Accessibility Audit

Active step: resolve-static-audit. Audit the UI files in scope against WCAG 2.2 Level AA across the static audit phases below, then report the `resolve-static-audit` progress event per the worker contract.

### Phase 2: Semantics & Structure

- **Headings:** logical order (no skipped levels), one `<h1>` per page/route, no headings used for styling
- **Landmarks:** `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<section>` with names where multiple exist
- **Lists:** `<ul>`/`<ol>`/`<dl>` for grouped items, not stacked `<div>`s
- **Tables:** `<thead>`/`<tbody>`/`<th scope="...">`/`<caption>` when data-tabular; not for layout
- **Links vs buttons:** `<a>` for navigation, `<button>` for actions. Flag `<div onClick>` or `<a href="#" onClick>`.
- **Custom widgets:** flag any custom interactive built from `<div>`/`<span>` without proper role + keyboard + state. Recommend native or established a11y library (Radix, Headless UI, React Aria) before rolling custom.
- **Section markup:** `<article>`, `<section>` used semantically, not as styled containers.
- **Skip links:** present and visible on focus when there are repeated blocks.

WCAG mapping: 1.3.1, 2.4.1, 2.4.6, 4.1.2.

### Phase 3: ARIA & Naming

- **Names** — every interactive element has an accessible name (visible label, `aria-label`, `aria-labelledby`). Icon-only buttons must declare a name.
- **Roles** — only added when native semantics are insufficient. Flag redundant roles (e.g. `role="button"` on `<button>`).
- **States** — `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`, `aria-disabled`, `aria-current` reflect actual state and update on interaction.
- **Properties** — `aria-controls`, `aria-describedby`, `aria-haspopup`, `aria-owns` reference existing IDs.
- **Hidden** — `aria-hidden="true"` never on focusable elements; decorative SVG/icons use `aria-hidden` + `focusable="false"`; visually-hidden but assistive-tech-accessible content uses `sr-only` (Tailwind) or equivalent.
- **Live regions** — `aria-live="polite"|"assertive"` + `aria-atomic` used appropriately; avoid spamming.
- **No ARIA misuse** — `role="presentation"` on a button defeats the purpose; `aria-label` overriding visible text creates mismatch.

WCAG mapping: 4.1.2, 4.1.3.

### Phase 4: Keyboard & Focus

- **All functionality keyboard-reachable** — no `<div onClick>` without keyboard handler; no `tabindex="-1"` on what should be focusable; no `tabindex` > 0 (overrides natural order).
- **Tab order** matches visual order; no orphan focusable nodes outside viewport without intent.
- **Focus visible** — never `outline: none` without a replacement. Tailwind: prefer `focus-visible:` over `focus:` to avoid showing focus rings on mouse click. Custom focus styles meet `2.4.11 Focus Not Obscured` and `2.4.13 Focus Appearance` (WCAG 2.2 AA additions).
- **Focus management on interaction:**
    - **Modals/dialogs** — initial focus inside on open, focus trapped, returns to trigger on close. React: `useRef` on trigger, restore in cleanup. Recommend `<dialog>` element or library (`Radix Dialog`, `react-aria` `useDialog`) over hand-rolled.
    - **Menus / dropdowns** — Escape closes, arrow keys navigate, focus returns to trigger.
    - **Route changes** (SPA) — focus moved to `<h1>` or main landmark; or announced via live region.
    - **Async content** — focus or announcement after load if it changes meaning.
- **Drag-and-drop** — keyboard alternative provided (WCAG 2.5.7).
- **Custom widget keyboard patterns** — comply with WAI-ARIA Authoring Practices (combobox, listbox, tabs, accordion).

WCAG mapping: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.4.13, 2.5.7.

### Phase 5: Forms

- **Every input has a label** — `<label for="...">` or wrapping `<label>`; never placeholder-as-label.
- **Programmatic name matches visible label** (WCAG 2.5.3).
- **Instructions before input**, not after.
- **`autocomplete`** present on personal-info fields (WCAG 1.3.5).
- **Errors:**
    - Identified clearly (`aria-invalid="true"`)
    - Described inline (`aria-describedby` → error message)
    - Summarized at top of form for long forms
    - Do not rely on color alone (icon + text + color)
    - Don't lose user input on validation failure
- **Required fields** marked both visually and programmatically (`required` attribute, not just `*`).
- **Authentication** — no cognitive-function tests (WCAG 3.3.8); paste allowed in password fields.
- **Help** — consistent location (WCAG 3.2.6).
- **No redundant entry** — preserve previously entered info (WCAG 3.3.7).

WCAG mapping: 1.3.5, 2.5.3, 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.7, 3.3.8, 4.1.2.

### Phase 6: Visual Design (Tailwind / CSS)

- **Contrast** (WCAG 1.4.3):
    - Body text ≥ 4.5:1 against background
    - Large text (≥18pt or 14pt bold) ≥ 3:1
    - Tailwind tokens: check `text-gray-400 bg-white` etc. against actual hex values. Compute ratio when tokens are in the diff.
- **Non-text contrast** (WCAG 1.4.11): UI components, focus indicators, icons ≥ 3:1.
- **Color alone** never conveys meaning (WCAG 1.4.1) — pair with text/icon/pattern.
- **Text resizing** (WCAG 1.4.4): no `font-size` in `px` for body text where it blocks user zoom; layout survives 200% zoom.
- **Reflow** (WCAG 1.4.10): no horizontal scroll at 320 CSS px width for reading flows.
- **Text spacing** (WCAG 1.4.12): no `overflow: hidden` clipping after text-spacing user adjustments.
- **Target size** (WCAG 2.5.8 AA): interactive targets ≥ 24×24 CSS px (WCAG 2.2 AA new); prefer 44×44 for primary actions.
- **Motion**:
    - Respect `prefers-reduced-motion` (`@media (prefers-reduced-motion: reduce)`)
    - No autoplay > 5s without controls (WCAG 2.2.2)
    - No content flashing > 3 times per second (WCAG 2.3.1)
- **Forced colors / high contrast** mode (Windows): no `background-image` replacing essential text; respects system colors.

WCAG mapping: 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.2.2, 2.3.1, 2.3.3, 2.5.8.

### Phase 7: Media & Non-Text Content

- **Images:**
    - Informative `<img>` has meaningful `alt`
    - Decorative `<img>` has `alt=""` (and SVG has `aria-hidden="true"`)
    - Functional `<img>` (e.g. inside `<button>`) describes the action, not the image
    - Complex images (charts/diagrams) have long descriptions adjacent or via `aria-describedby`
- **SVG:** decorative → `aria-hidden="true" focusable="false"`; meaningful → `<title>` + `role="img"`.
- **Video:** captions for prerecorded (1.2.2), audio description when visuals are essential (1.2.5).
- **Audio:** transcript provided.
- **No autoplay with sound**; controls available immediately.

WCAG mapping: 1.1.1, 1.2.1, 1.2.2, 1.2.3, 1.2.5, 1.4.2.

### Phase 8: Dynamic Content & SPA

- **Route announcements** — SPA route change updates `document.title` and announces in a live region or moves focus.
- **Live regions** for async results (toasts, validation summaries, search count) at appropriate politeness; avoid duplicate announcements.
- **Loading states** — `aria-busy="true"` on the region being loaded; replaced with content + announcement on complete.
- **Optimistic updates** — failure announced.
- **Modals on route change** — closed and focus restored.
- **Astro client directives** — verify hydration boundaries do not leave interactive elements without JS handlers; `client:visible` may delay focus management.

WCAG mapping: 4.1.3, 2.4.2, 1.3.2.
