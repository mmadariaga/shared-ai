# Design Step — Interfaces

Active step: interfaces. Write `interfaces.md` and verify it, then report the `interfaces` progress event per the worker contract.

## Generate interfaces.md

Write to `openspec/changes/{resolved_change_name}/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage (unlike `implementation.md`, which the implementation phase preserves byte-for-byte), so its `## Step N` keys always match the current `tasks.md` and cannot desync.

Fetch @sai/policies/step-contract-format.md

Emit one section per qualifying step, keyed by the same integer as `tasks.md`; apply the fetched policy's format and omission rules in full.

## Cited-path existence gate (blocking)

After `interfaces.md` verifies successfully and before reporting the `interfaces` progress event, Fetch @sai/policies/tool-resolution.md and resolve `check-cited-paths.js` by its per-harness order, including the opencode XDG fallback. Run `node <tool> sai-2 <change-name> --cwd <project-root>`. A non-zero exit is blocking: `A` paths may stay absent, but every `M`/`D`/`R` path in `tasks.md` and every path in `interfaces.md` must exist — fix the plan entries (using the tool's basename candidates as suggestions only — the tool never rewrites artifacts) and re-run until it passes. This gate is read-only and performs no auto-fix.

When no candidate exists, name the tried candidates and proceed without this check. This is an explicit optional-gate exception to the tool-resolution policy's default stop rule; it does not authorize a prose replacement for the checker.
