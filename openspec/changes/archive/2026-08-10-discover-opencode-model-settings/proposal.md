**Complexity**: high (5 capabilities: 3 new, 2 modified)
<!-- First line of the file. Derive per `## Complexity Derivation Rubric` in sai/instructions/spec.propose.md, after specs/**/*.md are written. Optional trailing parenthetical, e.g. `medium (3 files, no breaking change)` — parsers ignore everything from the first `(`. Any change that adds content above `## Why` must re-anchor this line in openspec/specs/proposal-complexity/spec.md rather than displace it. -->

## Why

The post-setup agent customizer's OpenCode selector is a combined placeholder model×effort frame that cannot represent OpenCode's provider-specific model catalog or model-specific variants; flattening the live catalog into one frame would produce roughly 276 entries. Replace the placeholder with a dependent provider → model → variant flow backed by the installed opencode CLI, keeping the customization result in memory under the existing zero-write contract.

## What Changes

- The OpenCode harness path of the post-setup agent customizer discovers the live model catalog from the installed opencode CLI (`opencode models`, without `--refresh`) instead of offering frozen placeholder model/effort options.
- OpenCode settings selection becomes three dependent navigable screens: provider, then model scoped to the chosen provider, then — when the chosen model exposes variants — variant. Each screen offers only valid choices, so the impractically large flattened menu is avoided.
- Variant discovery runs `opencode models <provider> --verbose` after model selection and parses its multiline model records (header line followed by a pretty-printed JSON object) to extract the selected model's variants.
- The variant screen offers a `Default (no variant)` option alongside the discovered variants; it is represented internally by a sentinel distinct from every possible variant string, so a discovered variant literally named `Default` or `default` stays separately selectable. Selecting the no-variant option omits the variant from the returned settings, and the variant screen is skipped entirely when the selected model exposes no variants.
- Discovery or parsing failure at any stage is a non-fatal customization cancellation: no placeholder fallback, no invalid override, and the flow completes normally without hard-exiting.
- Claude Code keeps its placeholder combined model/effort frame and `effort` mapping unchanged; the provider screen is OpenCode-specific.
- The OpenCode override preserves the canonical keys `model` and optional `variant`, stays non-persistent and in memory, and writes nothing.
- The stale opencode agent-count assertions in `agent-tunable-ownership` are reconciled to manifest-derived phrasing without hardcoding counts.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Each becomes specs/<name>/spec.md. Use kebab-case. -->
- `opencode-model-discovery`: discover the provider and model identifiers available from the installed opencode CLI's effective local catalog and derive the provider set by splitting each model identifier at its first `/`.
- `opencode-variant-discovery`: query `opencode models <provider> --verbose`, parse its multiline model records, and obtain the variants of the selected model by full identity.
- `opencode-settings-selection`: present the dependent provider → model → optional variant screens and return in-memory shared settings carrying `model` and optional `variant`; the per-agent local-override operation constructs the final override.

### Modified Capabilities
<!-- Existing capabilities whose requirements are changing. Leave empty if none. -->
- `agent-customization-menu`: the normative single combined-frame requirement becomes harness-split — Claude Code keeps the fake combined placeholder frame, while OpenCode uses the dependent discovery-backed settings flow; cancellation, TTY, select-once/apply-to-all, and zero-write behavior are preserved.
- `agent-tunable-ownership`: the stale "7 opencode agent projections" and "7 opencode agent files" assertions are reconciled to manifest-derived phrasing without hardcoding manifest-derived counts.

## Impact

- `M` `bin/agent-customization.js` — replace the OpenCode combined placeholder frame (`FAKE_MODEL_OPTIONS` × `FAKE_EFFORT_OPTIONS`, `buildCombinedOptions`, `parseCombinedEntry`) with the dependent discovery flow; keep the Claude Code placeholder path and the adapter boundary.
- `M` `test/agent-customization-menu.test.js` — the combined-frame, parsing, ordering, and override-shape tests (lines 341-452) are replaced by dependent-flow tests; command execution stays injectable; the agent-count assertion derives from the manifest fixture instead of a literal.
- `M` `openspec/specs/agent-customization-menu/spec.md` — via delta: combined-frame requirement split by harness; cancellation surfaces extended to the OpenCode screens.
- `M` `openspec/specs/agent-tunable-ownership/spec.md` — via delta: opencode count assertions reconciled to manifest-derived phrasing.
- `A` `openspec/specs/opencode-model-discovery/spec.md` — new capability delta.
- `A` `openspec/specs/opencode-variant-discovery/spec.md` — new capability delta.
- `A` `openspec/specs/opencode-settings-selection/spec.md` — new capability delta.
- `M` `GLOSSARY.md` — add `Model Variant` term and the effort/variant flagged ambiguity.
- No changes to `sai/install-manifest.json`, installed agent files, or any configuration.

## Proposal Research Documentation

**Local files**:

- `bin/agent-customization.js:14-121` — the current placeholder options, combined-frame parser, adapter boundary, and menu traversal
- `bin/install-flow.js:20-21` — the canonical tunable keys (`OPENCODE_TUNABLE_KEYS = ['model', 'variant']`)
- `bin/install-flow.js:322-389` — the existing injectable opencode command-probe pattern (`probeOpencode`, `offerOpencodeInstall` with injectable `probe`/`runInstall`)
- `test/agent-customization-menu.test.js:25-46,321-456` — the agent-count assertions and the combined-frame, parsing, ordering, and override-shape tests
- `openspec/specs/agent-customization-menu/spec.md:56-166` — the complete OpenCode traversal, Shared settings selection, fake settings selection, non-persistent override, and cancellation requirements
- `openspec/specs/agent-tunable-ownership/spec.md:8-31,125-133` — the tunable-keys ownership contract and the stale opencode count assertions
- `sai/install-manifest.json` — the 17 tunable-seed agent projections (7 Claude + 10 opencode) that ground the agent-count reconciliation
- `openspec/changes/reconcile-opencode-agent-file-specs/proposal.md` — the in-flight sibling change; its "unaffected" claim for `agent-tunable-ownership` conflicts with the file's actual opencode counts and is corrected here
- `GLOSSARY.md` — existing `Managed Worker` entry; no variant/effort term exists yet

**External URLs**: None — the CLI behavior was grounded by probing the installed opencode CLI 1.18.16 locally (`opencode models`, `opencode models --help`, `opencode models <provider> --verbose`, `opencode models --refresh`).

## Additional Notes

- **Probed CLI contract (opencode 1.18.16).** `opencode models` prints one `provider/model-id` line per model with no header (65 models across 5 providers in the local catalog). `opencode models <provider> --verbose` prints a header line carrying the model's full identity followed by a pretty-printed 2-space-indented JSON object; records are separated by one blank line and the output ends at the final `}` with no trailing blank. The JSON carries a `variants` object (`{}` when none; keys like `low`/`high`/`max` when present). The CLI supports provider filtering via the positional but has no exact-model filter and no machine-readable `--json` contract; parsing therefore accumulates lines after a header until `JSON.parse` succeeds.
- **`--refresh` is deliberately not passed.** `opencode models --refresh` fetches the models.dev cache (~3.5 s) and prints an ANSI status line to stderr; the flow uses the effective local catalog and never triggers an implicit network operation.
- **Two CLI launches per completed flow.** `opencode models` once for the catalog (reused for the provider's model screen), then `opencode models <provider> --verbose` after model selection — accepted in exchange for incremental, provider-scoped discovery and lower initial latency than one full `--verbose` parse.
- **Effort/variant reframing.** "Effort" in the old shared UI concept is OpenCode's model-specific variant, not a global list; Claude Code keeps `effort` as its own tunable key. Provider selection is navigation over the model catalog, not a persisted agent setting — the override carries no separate provider key, while its `model` value is the full `provider/model-id` identity the opencode agent frontmatter requires.
- **Failure semantics.** Discovery/parsing failure (non-zero exit, unparseable output, empty catalog, missing selected-model record) cancels OpenCode customization without placeholder fallback or invalid override; cancellation preserves the existing non-hard-exit contract.
- **Agent-count reconciliation.** `agent-tunable-ownership` still pins "the 7 opencode agent projections" (line 22) and "7 opencode agent files" (lines 130-132), while the manifest has declared 10 opencode agent projections since `2026-08-08-relocate-generic-opencode-agents`. The sibling change `reconcile-opencode-agent-file-specs` claims that spec is "Claude-only and current (7)" — factually wrong for those opencode counts — so this change reconciles them to manifest-derived phrasing ("the opencode agent projections declared by the manifest") without hardcoding the count, matching the fixture-assertion framing `agent-customization-menu` already uses. The deferred `agent-install-diagnostics` and `managed-worker-registry` count defects remain owned by the sibling's named follow-up change `correct-agent-projection-counts` and are not widened into this change.
- **Select-once and zero-write preserved.** The dependent flow runs exactly once for the whole confirmed agent subset and its result applies to every selected agent; the override stays in memory (`persistent: false`), writes nothing, and leaves agent files untouched.
- **Verification.** Correctness is verified by `openspec validate` and by reading the new specs against the probed CLI output, `bin/agent-customization.js`, and `bin/install-flow.js`'s probe pattern; the test surface is updated in the implementation phase.
