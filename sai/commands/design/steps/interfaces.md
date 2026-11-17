# Design Step — Interfaces

Active step: interfaces. Write `interfaces.md` and verify it, then report the `interfaces` step.

## Generate interfaces.md

Write to `openspec/changes/{resolved_change_name}/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage, so its `## Step N` keys always match the current `tasks.md` and cannot desync.

Fetch `@sai/policies/step-contract-format.md`. A change whose `.openspec.yaml` sets `skip_specs: true` has no spec scenarios: anchor each assertion to a statement of `proposal.md`, as that policy says.

Emit one section per qualifying step, keyed by the same integer as `tasks.md`; apply the fetched policy's format and omission rules in full. Write each step's `**Test assertions**` as the policy's list, and put its smoke-test mark on every assertion that meets the policy's criterion.

## Smoke-test tagging line

When at least one assertion of `interfaces.md` carries the smoke-test mark, add the field `**Smoke-test tagging**` to `## Implementation Context` in `tasks.md`, after `**Test Command**`, and keep the `**Test Command**` field unchanged. The `tasks` step ran first and already researched the project's test runner: choose the mechanism from that research, and write one line that names one of these:

- the project's native tag mechanism for the test runner, with its concrete syntax (for example a trait, category, marker, or tag annotation);
- `[smoke-test]` in the test name, when the runner has no native tag mechanism and its test names can hold the text;
- that the tests stay untagged, when the runner has neither.

When no assertion is marked, or `interfaces.md` holds the `None — no step contracts` sentinel, `tasks.md` carries no `**Smoke-test tagging**` field; remove one that an earlier run wrote.

## Cited-path existence gate (blocking)

After `interfaces.md` verifies successfully and before reporting the `interfaces` step, Fetch `@sai/policies/tool-resolution.md` and resolve `check-cited-paths.js` through the fetch tool as it states. Run `node <tool> sai-2 <change-name> --cwd <project-root>`. A non-zero exit is blocking: `A` paths may stay absent, but every `M`/`D`/`R` path in `tasks.md` and every path in `interfaces.md` must exist — fix the plan entries (using the tool's basename candidates as suggestions only — the tool never rewrites artifacts) and re-run until it passes. This gate is read-only and performs no auto-fix.

When no candidate exists, name the tried candidates and proceed without this check. This is an explicit optional-gate exception to the tool-resolution policy's default stop rule; it does not authorize a prose replacement for the checker.
