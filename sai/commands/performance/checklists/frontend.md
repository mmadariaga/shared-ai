# Performance Checklist — Frontend

For routes/components in scope, evaluate:

**Core Web Vitals (impact on)**
- **LCP** — render-blocking CSS/JS, oversized hero images, late-loading fonts, server response time, hydration delay
- **INP** — long tasks > 50ms, heavy event handlers, synchronous state cascades, expensive layouts on interaction
- **CLS** — missing `width`/`height` on images, late-injected content (banners, ads), font swap without `font-display: optional`/`swap` strategy

**Bundle & Delivery**
- Bundle size delta in the diff (from existing bundle stats; running the analyzer belongs to `resolve-diagnostics`)
- New dependencies pulled in: tree-shakable? side-effects flag? alternatives lighter?
- Dynamic import opportunities for non-critical paths
- Duplicate dependencies (different versions of the same lib)
- Missing `loading="lazy"` on below-the-fold images
- Render-blocking `<script>` without `defer`/`async`

**React Specific**
- Missing `useMemo`/`useCallback` only where prop-identity matters (don't flag unless the child is `memo` or expensive)
- Inline object/array props causing child re-renders of `memo`'d components
- State lifted too high causing wide subtree re-renders
- Heavy work in render body instead of `useMemo` / web worker
- Missing `key` or unstable `key` on lists
- `useEffect` dependencies causing render loops

**Astro Specific**
- Client directives (`client:load`, `client:idle`, `client:visible`) overused — defaults to no JS
- Component shipped to client when island-static would suffice

**Tailwind / CSS**
- Unused custom classes left after refactor

**Network**
- Waterfall: critical resource depending on a non-critical earlier request
- Missing `preload`/`preconnect` for critical third-party origins
- Cache headers absent on static assets
- API calls in `useEffect` that could be SSR/loader-hoisted
